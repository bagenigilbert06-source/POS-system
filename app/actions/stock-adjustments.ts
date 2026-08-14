'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auditEvent, branch, inventoryBalance, product, stockAdjustment, stockAdjustmentItem, stockMovement } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'
import { stockVariance } from '@/lib/inventory/rules'
import { applyInventoryMovement } from '@/lib/inventory/inventory-service'

const adjustmentSchema = z.object({
  branchId: z.string().min(1),
  type: z.enum(['stocktake', 'loss', 'damage', 'correction']),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantityAfter: z.coerce.number().int().nonnegative().max(10_000_000),
  })).min(1).max(500),
  notes: z.string().trim().min(3).max(500),
})

const reorderSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1),
  minStock: z.coerce.number().int().nonnegative().max(10_000_000),
})

async function inventoryContext(permission: PermissionEnum) {
  const authorization = await requirePermission(permission)
  const workspace = await WorkspaceService.getWorkspaceConfig(authorization.organizationId, authorization.userId)
  if (!workspace?.enabledModules.includes('inventory')) throw new Error('Inventory module unavailable')
  return { userId: authorization.userId, orgId: authorization.organizationId, authorization }
}

async function refreshInventory(orgId: string) {
  await invalidateProductReadCache(orgId)
  ;['/dashboard', '/dashboard/inventory', '/dashboard/products', '/dashboard/purchases', '/dashboard/reports'].forEach((path) => revalidatePath(path))
}

export async function getInventoryControlData() {
  const { orgId, authorization } = await inventoryContext(PermissionEnum.INVENTORY_VIEW)
  const [movements, adjustments, balances, branches] = await Promise.all([
    db.select().from(stockMovement).where(eq(stockMovement.orgId, orgId)).orderBy(desc(stockMovement.createdAt)).limit(250),
    db.select().from(stockAdjustment).where(eq(stockAdjustment.orgId, orgId)).orderBy(desc(stockAdjustment.createdAt)).limit(100),
    db.select().from(inventoryBalance).where(and(eq(inventoryBalance.orgId, orgId), authorization.isOrganizationWide ? undefined : inArray(inventoryBalance.branchId, authorization.branchIds.length ? authorization.branchIds : ['']))),
    db.select().from(branch).where(and(eq(branch.organizationId, orgId), authorization.isOrganizationWide ? undefined : inArray(branch.id, authorization.branchIds.length ? authorization.branchIds : ['']))).orderBy(desc(branch.isMain), branch.name),
  ])
  const adjustmentIds = adjustments.map((item) => item.id)
  const adjustmentItems = adjustmentIds.length
    ? await db.select().from(stockAdjustmentItem).where(and(eq(stockAdjustmentItem.orgId, orgId), inArray(stockAdjustmentItem.adjustmentId, adjustmentIds)))
    : []
  return { movements, adjustments, adjustmentItems, balances, branches }
}

export async function createStockAdjustment(input: z.input<typeof adjustmentSchema>) {
  const data = adjustmentSchema.parse(input)
  const authorization = await requirePermission(PermissionEnum.INVENTORY_ADJUST)
  const { userId, organizationId: orgId } = authorization
  if (!authorization.isOrganizationWide && !authorization.branchIds.includes(data.branchId)) throw new Error('You do not have access to this inventory location')
  const uniqueProductIds = new Set(data.items.map((item) => item.productId))
  if (uniqueProductIds.size !== data.items.length) throw new Error('Each product can only appear once in a stock count')

  const [products, balances, locations] = await Promise.all([
    db.select().from(product).where(and(eq(product.orgId, orgId), inArray(product.id, [...uniqueProductIds]))),
    db.select().from(inventoryBalance).where(and(eq(inventoryBalance.orgId, orgId), eq(inventoryBalance.branchId, data.branchId), inArray(inventoryBalance.productId, [...uniqueProductIds]))),
    db.select({ id: branch.id }).from(branch).where(and(eq(branch.id, data.branchId), eq(branch.organizationId, orgId))).limit(1),
  ])
  if (!locations[0]) throw new Error('Inventory location not found')
  if (products.length !== data.items.length) throw new Error('One or more products were not found')
  const productsById = new Map(products.map((item) => [item.id, item]))
  const balanceByProduct = new Map(balances.map((item) => [item.productId, Number(item.onHand)]))
  const adjustmentId = generateId()
  const adjustmentNo = `ADJ-${Date.now().toString().slice(-8)}`

  await db.transaction(async (tx) => {
    await tx.insert(stockAdjustment).values({
      id: adjustmentId,
      adjustmentNo,
      type: data.type,
      status: 'pending',
      notes: data.notes,
      branchId: data.branchId,
      userId,
      orgId,
    })
    await tx.insert(stockAdjustmentItem).values(data.items.map((item) => {
      const current = productsById.get(item.productId)!
      return {
        id: generateId(),
        adjustmentId,
        productId: current.id,
        productName: current.name,
        quantityBefore: balanceByProduct.get(current.id) ?? 0,
        quantityAfter: item.quantityAfter,
        variance: stockVariance(balanceByProduct.get(current.id) ?? 0, item.quantityAfter),
        orgId,
      }
    }))
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'stock_adjustment_created',
      metadata: { adjustmentId, adjustmentNo, type: data.type, itemsCount: data.items.length },
    })
  })
  revalidatePath('/dashboard/inventory')
  return { adjustmentId, adjustmentNo, status: 'pending' as const }
}

export async function approveStockAdjustment(adjustmentId: string) {
  const id = z.string().min(1).parse(adjustmentId)
  const { userId, orgId, authorization } = await inventoryContext(PermissionEnum.INVENTORY_ADJUST)
  const [adjustment] = await db.select().from(stockAdjustment).where(and(eq(stockAdjustment.id, id), eq(stockAdjustment.orgId, orgId))).limit(1)
  if (!adjustment) throw new Error('Stock count not found')
  if (adjustment.branchId && !authorization.isOrganizationWide && !authorization.branchIds.includes(adjustment.branchId)) throw new Error('You do not have access to this inventory location')
  if (adjustment.status !== 'pending') throw new Error(`This stock count is already ${adjustment.status}`)

  await db.transaction(async (tx) => {
    const [claimed] = await tx.update(stockAdjustment).set({ status: 'approved', approvedBy: userId, approvedAt: new Date() }).where(and(eq(stockAdjustment.id, id), eq(stockAdjustment.orgId, orgId), eq(stockAdjustment.status, 'pending'))).returning({ id: stockAdjustment.id })
    if (!claimed) throw new Error('This stock count has already been reviewed')
    const items = await tx.select().from(stockAdjustmentItem).where(and(eq(stockAdjustmentItem.adjustmentId, id), eq(stockAdjustmentItem.orgId, orgId)))
    if (!items.length) throw new Error('This stock count has no items')
    const [fallbackBranch] = adjustment.branchId ? [{ id: adjustment.branchId }] : await tx.select({ id: branch.id }).from(branch).where(eq(branch.organizationId, orgId)).orderBy(desc(branch.isMain), branch.createdAt).limit(1)
    if (!fallbackBranch) throw new Error('Inventory location not found')

    for (const item of items) {
      // Apply the variance captured when the physical count was submitted.
      // This preserves sales and receipts that may happen while approval is pending.
      const variance = item.variance
      if (variance) await applyInventoryMovement(tx, { productId: item.productId, productName: item.productName, branchId: fallbackBranch.id, quantity: variance, type: adjustment.type === 'stocktake' ? 'stock_count' : `adjustment_${adjustment.type}`, referenceType: 'adjustment', referenceId: id, reason: adjustment.notes || `Approved ${adjustment.type}`, userId, orgId })
    }
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'stock_adjustment_approved', metadata: { adjustmentId: id, itemsCount: items.length } })
  })
  await refreshInventory(orgId)
  return { status: 'approved' as const }
}

export async function rejectStockAdjustment(adjustmentId: string, reason: string) {
  const id = z.string().min(1).parse(adjustmentId)
  const rejectionReason = z.string().trim().min(3).max(300).parse(reason)
  const { userId, orgId } = await inventoryContext(PermissionEnum.INVENTORY_ADJUST)
  const [rejected] = await db.update(stockAdjustment).set({ status: 'rejected', notes: `Rejected: ${rejectionReason}`, approvedBy: userId, approvedAt: new Date() }).where(and(eq(stockAdjustment.id, id), eq(stockAdjustment.orgId, orgId), eq(stockAdjustment.status, 'pending'))).returning({ id: stockAdjustment.id })
  if (!rejected) throw new Error('This stock count is unavailable or has already been reviewed')
  await db.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'stock_adjustment_rejected', metadata: { adjustmentId: id, reason: rejectionReason } })
  revalidatePath('/dashboard/inventory')
  return { status: 'rejected' as const }
}

export async function updateReorderLevel(input: z.input<typeof reorderSchema>) {
  const data = reorderSchema.parse(input)
  const { userId, orgId, authorization } = await inventoryContext(PermissionEnum.INVENTORY_ADJUST)
  if (!authorization.isOrganizationWide && !authorization.branchIds.includes(data.branchId)) throw new Error('You do not have access to this inventory location')
  const [updated] = await db.update(product).set({ minStock: data.minStock, updatedAt: new Date() }).where(and(eq(product.id, data.productId), eq(product.orgId, orgId), eq(product.isActive, true))).returning({ id: product.id, name: product.name })
  if (!updated) throw new Error('Product not found')
  await db.update(inventoryBalance).set({ reorderPoint: String(data.minStock), updatedAt: new Date() }).where(and(eq(inventoryBalance.productId, data.productId), eq(inventoryBalance.branchId, data.branchId), eq(inventoryBalance.orgId, orgId)))
  await db.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'inventory.reorder_level_updated', metadata: { productId: updated.id, productName: updated.name, minStock: data.minStock } })
  await refreshInventory(orgId)
}
