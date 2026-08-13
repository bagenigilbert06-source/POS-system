'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auditEvent, product, stockAdjustment, stockAdjustmentItem, stockMovement } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'
import { stockVariance } from '@/lib/inventory/rules'

const adjustmentSchema = z.object({
  type: z.enum(['stocktake', 'loss', 'damage', 'correction']),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantityAfter: z.coerce.number().int().nonnegative().max(10_000_000),
  })).min(1).max(500),
  notes: z.string().trim().min(3).max(500),
})

const reorderSchema = z.object({
  productId: z.string().min(1),
  minStock: z.coerce.number().int().nonnegative().max(10_000_000),
})

async function inventoryContext(permission: PermissionEnum) {
  const authorization = await requirePermission(permission)
  const workspace = await WorkspaceService.getWorkspaceConfig(authorization.organizationId, authorization.userId)
  if (!workspace?.enabledModules.includes('inventory')) throw new Error('Inventory module unavailable')
  return { userId: authorization.userId, orgId: authorization.organizationId }
}

async function refreshInventory(orgId: string) {
  await invalidateProductReadCache(orgId)
  ;['/dashboard', '/dashboard/inventory', '/dashboard/products', '/dashboard/purchases', '/dashboard/reports'].forEach((path) => revalidatePath(path))
}

export async function getInventoryControlData() {
  const { orgId } = await inventoryContext(PermissionEnum.INVENTORY_VIEW)
  const [movements, adjustments] = await Promise.all([
    db.select().from(stockMovement).where(eq(stockMovement.orgId, orgId)).orderBy(desc(stockMovement.createdAt)).limit(250),
    db.select().from(stockAdjustment).where(eq(stockAdjustment.orgId, orgId)).orderBy(desc(stockAdjustment.createdAt)).limit(100),
  ])
  const adjustmentIds = adjustments.map((item) => item.id)
  const adjustmentItems = adjustmentIds.length
    ? await db.select().from(stockAdjustmentItem).where(and(eq(stockAdjustmentItem.orgId, orgId), inArray(stockAdjustmentItem.adjustmentId, adjustmentIds)))
    : []
  return { movements, adjustments, adjustmentItems }
}

export async function createStockAdjustment(input: z.input<typeof adjustmentSchema>) {
  const data = adjustmentSchema.parse(input)
  const { userId, orgId } = await inventoryContext(PermissionEnum.INVENTORY_ADJUST)
  const uniqueProductIds = new Set(data.items.map((item) => item.productId))
  if (uniqueProductIds.size !== data.items.length) throw new Error('Each product can only appear once in a stock count')

  const products = await db.select().from(product).where(and(eq(product.orgId, orgId), inArray(product.id, [...uniqueProductIds])))
  if (products.length !== data.items.length) throw new Error('One or more products were not found')
  const productsById = new Map(products.map((item) => [item.id, item]))
  const adjustmentId = generateId()
  const adjustmentNo = `ADJ-${Date.now().toString().slice(-8)}`

  await db.transaction(async (tx) => {
    await tx.insert(stockAdjustment).values({
      id: adjustmentId,
      adjustmentNo,
      type: data.type,
      status: 'pending',
      notes: data.notes,
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
        quantityBefore: current.stock,
        quantityAfter: item.quantityAfter,
        variance: stockVariance(current.stock, item.quantityAfter),
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
  const { userId, orgId } = await inventoryContext(PermissionEnum.INVENTORY_ADJUST)
  const [adjustment] = await db.select().from(stockAdjustment).where(and(eq(stockAdjustment.id, id), eq(stockAdjustment.orgId, orgId))).limit(1)
  if (!adjustment) throw new Error('Stock count not found')
  if (adjustment.status !== 'pending') throw new Error(`This stock count is already ${adjustment.status}`)

  await db.transaction(async (tx) => {
    const [claimed] = await tx.update(stockAdjustment).set({ status: 'approved', approvedBy: userId, approvedAt: new Date() }).where(and(eq(stockAdjustment.id, id), eq(stockAdjustment.orgId, orgId), eq(stockAdjustment.status, 'pending'))).returning({ id: stockAdjustment.id })
    if (!claimed) throw new Error('This stock count has already been reviewed')
    const items = await tx.select().from(stockAdjustmentItem).where(and(eq(stockAdjustmentItem.adjustmentId, id), eq(stockAdjustmentItem.orgId, orgId)))
    if (!items.length) throw new Error('This stock count has no items')

    for (const item of items) {
      // Apply the variance captured when the physical count was submitted.
      // This preserves sales and receipts that may happen while approval is pending.
      const variance = item.variance
      const [updated] = await tx.update(product).set({ stock: sql`${product.stock} + ${variance}`, updatedAt: new Date() }).where(and(eq(product.id, item.productId), eq(product.orgId, orgId), eq(product.isActive, true), sql`${product.stock} + ${variance} >= 0`)).returning({ id: product.id, name: product.name, stockAfter: product.stock })
      if (!updated) throw new Error(`${item.productName} changed after this count. Record a fresh physical count.`)
      await tx.insert(stockMovement).values({
        id: generateId(),
        productId: updated.id,
        productName: updated.name,
        type: adjustment.type === 'stocktake' ? 'stock_count' : `adjustment_${adjustment.type}`,
        quantity: variance,
        stockBefore: updated.stockAfter - variance,
        stockAfter: updated.stockAfter,
        referenceType: 'adjustment',
        referenceId: id,
        reason: adjustment.notes || `Approved ${adjustment.type}`,
        userId,
        orgId,
      })
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
  const { userId, orgId } = await inventoryContext(PermissionEnum.INVENTORY_ADJUST)
  const [updated] = await db.update(product).set({ minStock: data.minStock, updatedAt: new Date() }).where(and(eq(product.id, data.productId), eq(product.orgId, orgId), eq(product.isActive, true))).returning({ id: product.id, name: product.name })
  if (!updated) throw new Error('Product not found')
  await db.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'inventory.reorder_level_updated', metadata: { productId: updated.id, productName: updated.name, minStock: data.minStock } })
  await refreshInventory(orgId)
}
