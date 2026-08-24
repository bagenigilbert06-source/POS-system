'use server'

import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { auditEvent, branch, inventoryBalance, inventoryLot, pharmacyConfiguration, pharmacyProduct, pharmacyReturnDisposition, product, salesReturn, supplier } from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { isPharmacyBusiness, normalizeExpiryWarningDays, pharmacyExpiryState } from '@/lib/pharmacy/rules'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { applyInventoryMovement } from '@/lib/inventory/inventory-service'
import { generateId } from '@/lib/utils'

async function pharmacyContext(permission: PermissionEnum) {
  const authorization = await requirePermission(permission)
  const config = await WorkspaceService.getWorkspaceConfig(authorization.organizationId, authorization.userId)
  if (!config || !isPharmacyBusiness(config.businessType, config.businessCategory)) throw new Error('This workflow is available to pharmacy workspaces')
  return { authorization, orgId: authorization.organizationId }
}

export async function getPharmacyBatchInventory() {
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.BATCH_TRACKING_VIEW)
  const [settings] = await db.select().from(pharmacyConfiguration).where(eq(pharmacyConfiguration.organizationId, orgId)).limit(1)
  const warningDays = normalizeExpiryWarningDays(Array.isArray(settings?.expiryWarningDays) ? settings.expiryWarningDays.map(Number) : [90, 60, 30, 7])
  const rows = await db.select({
    id: inventoryLot.id,
    productId: product.id,
    productName: product.name,
    brand: product.brand,
    genericName: pharmacyProduct.genericName,
    strength: pharmacyProduct.strength,
    dosageForm: pharmacyProduct.dosageForm,
    branchId: branch.id,
    branchName: branch.name,
    lotNumber: inventoryLot.lotNumber,
    quantity: inventoryLot.quantity,
    expiresAt: inventoryLot.expiresAt,
    receivedAt: inventoryLot.receivedAt,
    unitCost: inventoryLot.unitCost,
    lotStatus: inventoryLot.status,
    supplierName: supplier.name,
  }).from(inventoryLot)
    .innerJoin(product, and(eq(product.id, inventoryLot.productId), eq(product.orgId, orgId)))
    .innerJoin(pharmacyProduct, and(eq(pharmacyProduct.productId, product.id), eq(pharmacyProduct.organizationId, orgId)))
    .innerJoin(branch, and(eq(branch.id, inventoryLot.branchId), eq(branch.organizationId, orgId)))
    .leftJoin(supplier, and(eq(supplier.id, inventoryLot.supplierId), eq(supplier.orgId, orgId)))
    .where(and(
      eq(inventoryLot.orgId, orgId),
      authorization.isOrganizationWide ? undefined : inArray(inventoryLot.branchId, authorization.branchIds.length ? authorization.branchIds : ['']),
    ))
    .orderBy(asc(inventoryLot.expiresAt), product.name)

  const now = new Date()
  const batches = rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    unitCost: Number(row.unitCost),
    expiry: row.expiresAt ? pharmacyExpiryState(row.expiresAt, now, warningDays) : { status: 'normal' as const, daysRemaining: null },
  }))
  const returnedStock = await db.select({
    id: pharmacyReturnDisposition.id,
    productId: pharmacyReturnDisposition.productId,
    productName: product.name,
    genericName: pharmacyProduct.genericName,
    branchName: branch.name,
    branchId: pharmacyReturnDisposition.branchId,
    returnNo: salesReturn.returnNo,
    lotNumber: pharmacyReturnDisposition.lotNumber,
    originalLotId: pharmacyReturnDisposition.originalLotId,
    quantity: pharmacyReturnDisposition.quantity,
    notes: pharmacyReturnDisposition.notes,
    createdAt: pharmacyReturnDisposition.createdAt,
  }).from(pharmacyReturnDisposition)
    .innerJoin(product, and(eq(product.id, pharmacyReturnDisposition.productId), eq(product.orgId, orgId)))
    .innerJoin(pharmacyProduct, and(eq(pharmacyProduct.productId, product.id), eq(pharmacyProduct.organizationId, orgId)))
    .innerJoin(branch, and(eq(branch.id, pharmacyReturnDisposition.branchId), eq(branch.organizationId, orgId)))
    .innerJoin(salesReturn, and(eq(salesReturn.id, pharmacyReturnDisposition.returnId), eq(salesReturn.orgId, orgId)))
    .where(and(
      eq(pharmacyReturnDisposition.organizationId, orgId),
      eq(pharmacyReturnDisposition.status, 'quarantined'),
      authorization.isOrganizationWide ? undefined : inArray(pharmacyReturnDisposition.branchId, authorization.branchIds.length ? authorization.branchIds : ['']),
    )).orderBy(asc(pharmacyReturnDisposition.createdAt))
  return {
    canManageBatches: authorization.permissions.includes(PermissionEnum.INVENTORY_ADJUST),
    settings: {
      fefoEnabled: settings?.fefoEnabled ?? true,
      prescriptionWorkflowEnabled: settings?.prescriptionWorkflowEnabled ?? true,
      restrictedItemWorkflowEnabled: settings?.restrictedItemWorkflowEnabled ?? true,
    },
    warningDays,
    batches,
    returnedStock: returnedStock.map((item) => ({ ...item, quantity: Number(item.quantity) })),
    summary: {
      totalBatches: batches.length,
      availableUnits: batches.filter((item) => item.lotStatus === 'available' && item.expiry.status !== 'expired').reduce((sum, item) => sum + item.quantity, 0),
      expiringSoon: batches.filter((item) => ['expiring_soon', 'near_expiry'].includes(item.expiry.status)).length,
      expired: batches.filter((item) => item.expiry.status === 'expired').length,
      valueAtRisk: batches.filter((item) => item.expiry.status !== 'normal').reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
    },
  }
}

export async function updatePharmacyExpirySettings(formData: FormData) {
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.INVENTORY_ADJUST)
  const rawDays = String(formData.get('expiryWarningDays') ?? '')
    .split(',').map((value) => Number(value.trim())).filter(Number.isFinite)
  const expiryWarningDays = normalizeExpiryWarningDays(rawDays)
  await db.insert(pharmacyConfiguration).values({
    organizationId: orgId,
    fefoEnabled: true,
    expiryWarningDays,
    prescriptionWorkflowEnabled: true,
    restrictedItemWorkflowEnabled: true,
  }).onConflictDoUpdate({
    target: pharmacyConfiguration.organizationId,
    set: { fefoEnabled: true, expiryWarningDays, prescriptionWorkflowEnabled: true, restrictedItemWorkflowEnabled: true, updatedAt: new Date() },
  })
  await db.insert(auditEvent).values({
    id: generateId(), organizationId: orgId, userId: authorization.userId, action: 'pharmacy.expiry_settings_updated',
    metadata: { expiryWarningDays, fefoEnabled: true },
  })
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/inventory/batches')
}

const returnDispositionSchema = z.object({
  dispositionId: z.string().min(1),
  decision: z.enum(['released', 'disposed', 'supplier_return']),
  reason: z.string().trim().min(3).max(300),
})

export async function updatePharmacyReturnDisposition(input: z.input<typeof returnDispositionSchema>) {
  const data = returnDispositionSchema.parse(input)
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.INVENTORY_ADJUST)
  await db.transaction(async (tx) => {
    const [item] = await tx.select({
      id: pharmacyReturnDisposition.id,
      productId: pharmacyReturnDisposition.productId,
      productName: product.name,
      branchId: pharmacyReturnDisposition.branchId,
      lotId: pharmacyReturnDisposition.originalLotId,
      quantity: pharmacyReturnDisposition.quantity,
      status: pharmacyReturnDisposition.status,
      returnId: pharmacyReturnDisposition.returnId,
    }).from(pharmacyReturnDisposition)
      .innerJoin(product, and(eq(product.id, pharmacyReturnDisposition.productId), eq(product.orgId, orgId)))
      .where(and(eq(pharmacyReturnDisposition.id, data.dispositionId), eq(pharmacyReturnDisposition.organizationId, orgId)))
      .limit(1).for('update')
    if (!item) throw new Error('Returned medicine record not found')
    if (!authorization.isOrganizationWide && !authorization.branchIds.includes(item.branchId)) throw new Error('This return is outside your assigned branches')
    if (item.status !== 'quarantined') throw new Error('This returned medicine has already been reviewed')
    const quantity = Number(item.quantity)
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Returned quantity requires inventory reconciliation')

    const [releasedUnavailable] = await tx.update(inventoryBalance).set({
      unavailable: sql`${inventoryBalance.unavailable} - ${quantity}`,
      updatedAt: new Date(),
    }).where(and(
      eq(inventoryBalance.productId, item.productId),
      eq(inventoryBalance.branchId, item.branchId),
      eq(inventoryBalance.orgId, orgId),
      sql`${inventoryBalance.unavailable} >= ${quantity}`,
    )).returning({ id: inventoryBalance.id })
    if (!releasedUnavailable) throw new Error('Returned stock quarantine balance is inconsistent')

    if (data.decision === 'released') {
      if (!item.lotId) throw new Error('This return has no original batch trace and cannot be released to saleable stock')
      const [lot] = await tx.select({ expiresAt: inventoryLot.expiresAt, status: inventoryLot.status })
        .from(inventoryLot).where(and(eq(inventoryLot.id, item.lotId), eq(inventoryLot.orgId, orgId), eq(inventoryLot.branchId, item.branchId))).limit(1).for('update')
      if (!lot || lot.status !== 'available') throw new Error('The original batch is not available for release')
      if (lot.expiresAt && lot.expiresAt <= new Date()) throw new Error('Expired returned medicine cannot be released')
      await tx.update(inventoryLot).set({ quantity: sql`${inventoryLot.quantity} + ${quantity}` }).where(eq(inventoryLot.id, item.lotId))
    } else {
      await applyInventoryMovement(tx, {
        productId: item.productId, productName: item.productName, branchId: item.branchId, quantity: -quantity,
        type: data.decision === 'disposed' ? 'return_disposal' : 'supplier_return', referenceType: 'pharmacy_return',
        referenceId: item.returnId, reason: data.reason, userId: authorization.userId, orgId,
      })
    }
    await tx.update(pharmacyReturnDisposition).set({ status: data.decision, notes: data.reason, updatedAt: new Date() })
      .where(eq(pharmacyReturnDisposition.id, item.id))
    await tx.insert(auditEvent).values({
      id: generateId(), organizationId: orgId, userId: authorization.userId, action: 'pharmacy.return_disposition_changed',
      metadata: { dispositionId: item.id, productId: item.productId, branchId: item.branchId, quantity, decision: data.decision, reason: data.reason },
    })
  })
  revalidatePath('/dashboard/inventory/batches')
  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard/pos')
}

const batchStatusSchema = z.object({ lotId: z.string().min(1), status: z.enum(['available', 'quarantined', 'disposed']), reason: z.string().trim().min(3).max(300) })

export async function updatePharmacyBatchStatus(input: z.input<typeof batchStatusSchema>) {
  const data = batchStatusSchema.parse(input)
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.INVENTORY_ADJUST)
  await db.transaction(async (tx) => {
    const [lot] = await tx.select({
      id: inventoryLot.id, productId: inventoryLot.productId, branchId: inventoryLot.branchId,
      quantity: inventoryLot.quantity, status: inventoryLot.status, expiresAt: inventoryLot.expiresAt,
      productName: product.name,
    }).from(inventoryLot).innerJoin(product, and(eq(product.id, inventoryLot.productId), eq(product.orgId, orgId)))
      .where(and(eq(inventoryLot.id, data.lotId), eq(inventoryLot.orgId, orgId))).limit(1).for('update')
    if (!lot) throw new Error('Medicine batch not found')
    if (!authorization.isOrganizationWide && !authorization.branchIds.includes(lot.branchId)) throw new Error('This batch is outside your assigned branches')
    if (lot.status === data.status) return
    const quantity = Number(lot.quantity)
    if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('This batch quantity requires inventory reconciliation before its status can change')
    if (data.status === 'available') {
      if (lot.status !== 'quarantined') throw new Error('Only a quarantined batch can be released')
      if (lot.expiresAt && lot.expiresAt <= new Date()) throw new Error('An expired batch cannot return to saleable stock')
      const [released] = await tx.update(inventoryBalance).set({ unavailable: sql`${inventoryBalance.unavailable} - ${quantity}`, updatedAt: new Date() })
        .where(and(eq(inventoryBalance.productId, lot.productId), eq(inventoryBalance.branchId, lot.branchId), eq(inventoryBalance.orgId, orgId), sql`${inventoryBalance.unavailable} >= ${quantity}`)).returning({ id: inventoryBalance.id })
      if (!released) throw new Error('Batch quarantine balance is inconsistent; review inventory before releasing it')
      await tx.update(inventoryLot).set({ status: 'available' }).where(eq(inventoryLot.id, lot.id))
    } else if (data.status === 'quarantined') {
      if (lot.status !== 'available') throw new Error('Only an available batch can be quarantined')
      const [quarantined] = await tx.update(inventoryBalance).set({ unavailable: sql`${inventoryBalance.unavailable} + ${quantity}`, updatedAt: new Date() })
        .where(and(eq(inventoryBalance.productId, lot.productId), eq(inventoryBalance.branchId, lot.branchId), eq(inventoryBalance.orgId, orgId))).returning({ id: inventoryBalance.id })
      if (!quarantined) throw new Error('Inventory balance is unavailable for this batch')
      await tx.update(inventoryLot).set({ status: 'quarantined' }).where(eq(inventoryLot.id, lot.id))
    } else {
      if (!['available', 'quarantined'].includes(lot.status)) throw new Error('This batch cannot be disposed from its current status')
      if (lot.status === 'quarantined') await tx.update(inventoryBalance).set({ unavailable: sql`${inventoryBalance.unavailable} - ${quantity}`, updatedAt: new Date() })
        .where(and(eq(inventoryBalance.productId, lot.productId), eq(inventoryBalance.branchId, lot.branchId), eq(inventoryBalance.orgId, orgId), sql`${inventoryBalance.unavailable} >= ${quantity}`))
      if (quantity > 0) await applyInventoryMovement(tx, { productId: lot.productId, productName: lot.productName, branchId: lot.branchId, quantity: -quantity, type: 'expiry_disposal', referenceType: 'inventory_lot', referenceId: lot.id, reason: data.reason, userId: authorization.userId, orgId })
      await tx.update(inventoryLot).set({ quantity: '0', status: 'disposed' }).where(eq(inventoryLot.id, lot.id))
    }
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId: authorization.userId, action: 'pharmacy.batch_status_changed', metadata: { lotId: lot.id, productId: lot.productId, branchId: lot.branchId, previousStatus: lot.status, nextStatus: data.status, quantity, reason: data.reason } })
  })
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard/inventory/batches')
  revalidatePath('/dashboard/pos')
}
