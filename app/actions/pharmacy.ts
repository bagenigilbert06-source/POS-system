'use server'

import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { auditEvent, branch, customer, inventoryBalance, inventoryLot, pharmacyConfiguration, pharmacyMedicineRecall, pharmacyProduct, pharmacyReturnDisposition, product, sale, saleItemLotAllocation, salesReturn, supplier } from '@/lib/db/schema'
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
  const supplierReturns = await db.select({
    id: pharmacyReturnDisposition.id, productName: product.name, branchName: branch.name, branchId: pharmacyReturnDisposition.branchId,
    quantity: pharmacyReturnDisposition.quantity, reference: pharmacyReturnDisposition.supplierReturnReference,
    status: pharmacyReturnDisposition.supplierReturnStatus, creditNote: pharmacyReturnDisposition.supplierCreditNote,
    notes: pharmacyReturnDisposition.notes, updatedAt: pharmacyReturnDisposition.updatedAt,
  }).from(pharmacyReturnDisposition)
    .innerJoin(product, and(eq(product.id, pharmacyReturnDisposition.productId), eq(product.orgId, orgId)))
    .innerJoin(branch, and(eq(branch.id, pharmacyReturnDisposition.branchId), eq(branch.organizationId, orgId)))
    .where(and(eq(pharmacyReturnDisposition.organizationId, orgId), eq(pharmacyReturnDisposition.status, 'supplier_return'), authorization.isOrganizationWide ? undefined : inArray(pharmacyReturnDisposition.branchId, authorization.branchIds.length ? authorization.branchIds : [''])))
    .orderBy(asc(pharmacyReturnDisposition.updatedAt))
  return {
    canManageBatches: authorization.permissions.includes(PermissionEnum.PHARMACY_BATCH_MANAGE),
    settings: {
      fefoEnabled: settings?.fefoEnabled ?? true,
      prescriptionWorkflowEnabled: settings?.prescriptionWorkflowEnabled ?? true,
      restrictedItemWorkflowEnabled: settings?.restrictedItemWorkflowEnabled ?? true,
    },
    warningDays,
    batches,
    returnedStock: returnedStock.map((item) => ({ ...item, quantity: Number(item.quantity) })),
    supplierReturns: supplierReturns.map((item) => ({ ...item, quantity: Number(item.quantity) })),
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
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.PHARMACY_BATCH_MANAGE)
  const tokens = String(formData.get('expiryWarningDays') ?? '').split(',').map((value) => value.trim()).filter(Boolean)
  const rawDays = tokens.map(Number)
  if (!tokens.length || rawDays.some((value) => !Number.isInteger(value) || value <= 0 || value > 730)) throw new Error('Warning days must be comma-separated whole numbers between 1 and 730')
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
  supplierReference: z.string().trim().max(120).optional(),
}).refine((value) => value.decision !== 'supplier_return' || Boolean(value.supplierReference), { message: 'Enter the supplier return reference', path: ['supplierReference'] })

export async function updatePharmacyReturnDisposition(input: z.input<typeof returnDispositionSchema>) {
  const data = returnDispositionSchema.parse(input)
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.PHARMACY_BATCH_MANAGE)
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
    await tx.update(pharmacyReturnDisposition).set({ status: data.decision, notes: data.reason, supplierReturnReference: data.decision === 'supplier_return' ? data.supplierReference : null, supplierReturnStatus: data.decision === 'supplier_return' ? 'pending' : null, updatedAt: new Date() })
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

const supplierSettlementSchema = z.object({ dispositionId: z.string().min(1), status: z.enum(['accepted', 'credited', 'rejected']), creditNote: z.string().trim().max(120).optional(), notes: z.string().trim().min(3).max(300) }).refine((value) => value.status !== 'credited' || Boolean(value.creditNote), { message: 'Enter the supplier credit-note reference', path: ['creditNote'] })

export async function settlePharmacySupplierReturn(input: z.input<typeof supplierSettlementSchema>) {
  const data = supplierSettlementSchema.parse(input)
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.PHARMACY_BATCH_MANAGE)
  await db.transaction(async (tx) => {
    const [item] = await tx.select({ record: pharmacyReturnDisposition, productName: product.name }).from(pharmacyReturnDisposition).innerJoin(product, and(eq(product.id, pharmacyReturnDisposition.productId), eq(product.orgId, orgId))).where(and(eq(pharmacyReturnDisposition.id, data.dispositionId), eq(pharmacyReturnDisposition.organizationId, orgId))).limit(1).for('update')
    if (!item || item.record.status !== 'supplier_return' || !['pending', 'accepted'].includes(item.record.supplierReturnStatus || '')) throw new Error('This supplier return is not awaiting settlement')
    if (!authorization.isOrganizationWide && !authorization.branchIds.includes(item.record.branchId)) throw new Error('This return is outside your assigned branches')
    if (data.status === 'rejected') {
      const quantity = Number(item.record.quantity)
      await applyInventoryMovement(tx, { productId: item.record.productId, productName: item.productName, branchId: item.record.branchId, quantity, type: 'supplier_return_rejected', referenceType: 'pharmacy_return', referenceId: item.record.returnId, reason: data.notes, userId: authorization.userId, orgId })
      await tx.update(inventoryBalance).set({ unavailable: sql`${inventoryBalance.unavailable} + ${quantity}`, updatedAt: new Date() }).where(and(eq(inventoryBalance.productId, item.record.productId), eq(inventoryBalance.branchId, item.record.branchId), eq(inventoryBalance.orgId, orgId)))
      await tx.update(pharmacyReturnDisposition).set({ status: 'quarantined', supplierReturnStatus: 'rejected', supplierResolvedBy: authorization.userId, supplierResolvedAt: new Date(), notes: data.notes, updatedAt: new Date() }).where(eq(pharmacyReturnDisposition.id, item.record.id))
    } else {
      await tx.update(pharmacyReturnDisposition).set({ supplierReturnStatus: data.status, supplierCreditNote: data.creditNote || null, supplierResolvedBy: authorization.userId, supplierResolvedAt: new Date(), notes: data.notes, updatedAt: new Date() }).where(eq(pharmacyReturnDisposition.id, item.record.id))
    }
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId: authorization.userId, action: 'pharmacy.supplier_return_settled', metadata: { dispositionId: item.record.id, supplierReference: item.record.supplierReturnReference, status: data.status, creditNote: data.creditNote || null, notes: data.notes } })
  })
  revalidatePath('/dashboard/inventory/batches'); revalidatePath('/dashboard/reports/pharmacy')
  return { success: true }
}

const batchStatusSchema = z.object({ lotId: z.string().min(1), status: z.enum(['available', 'quarantined', 'disposed']), reason: z.string().trim().min(3).max(300) })

export async function updatePharmacyBatchStatus(input: z.input<typeof batchStatusSchema>) {
  const data = batchStatusSchema.parse(input)
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.PHARMACY_BATCH_MANAGE)
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

const recallSchema = z.object({ lotId: z.string().min(1), reference: z.string().trim().min(2).max(120), reason: z.string().trim().min(5).max(500) })

export async function initiateMedicineRecall(input: z.input<typeof recallSchema>) {
  const data = recallSchema.parse(input)
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.PHARMACY_RECALL_MANAGE)
  const recallId = generateId()
  await db.transaction(async (tx) => {
    const [lot] = await tx.select({ id: inventoryLot.id, productId: inventoryLot.productId, branchId: inventoryLot.branchId, quantity: inventoryLot.quantity, status: inventoryLot.status })
      .from(inventoryLot).innerJoin(pharmacyProduct, and(eq(pharmacyProduct.productId, inventoryLot.productId), eq(pharmacyProduct.organizationId, orgId)))
      .where(and(eq(inventoryLot.id, data.lotId), eq(inventoryLot.orgId, orgId))).limit(1).for('update')
    if (!lot) throw new Error('Medicine batch not found')
    if (!authorization.isOrganizationWide && !authorization.branchIds.includes(lot.branchId)) throw new Error('This batch is outside your assigned branches')
    if (lot.status === 'disposed') throw new Error('A disposed batch cannot be recalled')
    const [existing] = await tx.select({ id: pharmacyMedicineRecall.id }).from(pharmacyMedicineRecall)
      .where(and(eq(pharmacyMedicineRecall.organizationId, orgId), eq(pharmacyMedicineRecall.lotId, lot.id), eq(pharmacyMedicineRecall.status, 'active'))).limit(1)
    if (existing) throw new Error('This batch already has an active recall')
    const quantity = Number(lot.quantity)
    if (lot.status === 'available' && quantity > 0) {
      await tx.update(inventoryBalance).set({ unavailable: sql`${inventoryBalance.unavailable} + ${quantity}`, updatedAt: new Date() })
        .where(and(eq(inventoryBalance.productId, lot.productId), eq(inventoryBalance.branchId, lot.branchId), eq(inventoryBalance.orgId, orgId)))
      await tx.update(inventoryLot).set({ status: 'recalled' }).where(eq(inventoryLot.id, lot.id))
    }
    await tx.insert(pharmacyMedicineRecall).values({ id: recallId, organizationId: orgId, branchId: lot.branchId, productId: lot.productId, lotId: lot.id, reference: data.reference, reason: data.reason, initiatedBy: authorization.userId })
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId: authorization.userId, action: 'pharmacy.recall_initiated', metadata: { recallId, lotId: lot.id, productId: lot.productId, branchId: lot.branchId, quantity, reference: data.reference, reason: data.reason } })
  })
  revalidatePath('/dashboard/inventory/batches'); revalidatePath('/dashboard/pharmacy/recalls'); revalidatePath('/dashboard/pos')
  return { success: true, recallId }
}

const resolveRecallSchema = z.object({ recallId: z.string().min(1), resolution: z.enum(['release', 'dispose']), notes: z.string().trim().min(5).max(500) })

export async function resolveMedicineRecall(input: z.input<typeof resolveRecallSchema>) {
  const data = resolveRecallSchema.parse(input)
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.PHARMACY_RECALL_MANAGE)
  await db.transaction(async (tx) => {
    const [record] = await tx.select({ recall: pharmacyMedicineRecall, lot: inventoryLot, productName: product.name }).from(pharmacyMedicineRecall)
      .innerJoin(inventoryLot, eq(inventoryLot.id, pharmacyMedicineRecall.lotId)).innerJoin(product, and(eq(product.id, pharmacyMedicineRecall.productId), eq(product.orgId, orgId)))
      .where(and(eq(pharmacyMedicineRecall.id, data.recallId), eq(pharmacyMedicineRecall.organizationId, orgId))).limit(1).for('update')
    if (!record || record.recall.status !== 'active') throw new Error('Active recall not found')
    if (!authorization.isOrganizationWide && !authorization.branchIds.includes(record.recall.branchId)) throw new Error('This recall is outside your assigned branches')
    const quantity = Number(record.lot.quantity)
    if (data.resolution === 'release') {
      if (!record.lot.expiresAt) throw new Error('A batch without an expiry date cannot be released')
      if (record.lot.expiresAt <= new Date()) throw new Error('An expired batch cannot be released')
      const [balance] = await tx.update(inventoryBalance).set({ unavailable: sql`${inventoryBalance.unavailable} - ${quantity}`, updatedAt: new Date() })
        .where(and(eq(inventoryBalance.productId, record.recall.productId), eq(inventoryBalance.branchId, record.recall.branchId), eq(inventoryBalance.orgId, orgId), sql`${inventoryBalance.unavailable} >= ${quantity}`)).returning({ id: inventoryBalance.id })
      if (!balance) throw new Error('Recall quarantine balance is inconsistent')
      await tx.update(inventoryLot).set({ status: 'available' }).where(eq(inventoryLot.id, record.recall.lotId))
    } else {
      if (quantity > 0) await applyInventoryMovement(tx, { productId: record.recall.productId, productName: record.productName, branchId: record.recall.branchId, quantity: -quantity, type: 'recall_disposal', referenceType: 'medicine_recall', referenceId: record.recall.id, reason: data.notes, userId: authorization.userId, orgId })
      await tx.update(inventoryBalance).set({ unavailable: sql`greatest(0, ${inventoryBalance.unavailable} - ${quantity})`, updatedAt: new Date() }).where(and(eq(inventoryBalance.productId, record.recall.productId), eq(inventoryBalance.branchId, record.recall.branchId), eq(inventoryBalance.orgId, orgId)))
      await tx.update(inventoryLot).set({ status: 'disposed', quantity: '0' }).where(eq(inventoryLot.id, record.recall.lotId))
    }
    await tx.update(pharmacyMedicineRecall).set({ status: 'resolved', resolvedBy: authorization.userId, resolvedAt: new Date(), resolutionNotes: `${data.resolution}: ${data.notes}`, updatedAt: new Date() }).where(eq(pharmacyMedicineRecall.id, record.recall.id))
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId: authorization.userId, action: 'pharmacy.recall_resolved', metadata: { recallId: record.recall.id, lotId: record.recall.lotId, resolution: data.resolution, notes: data.notes } })
  })
  revalidatePath('/dashboard/inventory/batches'); revalidatePath('/dashboard/pharmacy/recalls'); revalidatePath('/dashboard/pos')
  return { success: true }
}

export async function getMedicineRecalls() {
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.BATCH_TRACKING_VIEW)
  const rows = await db.select({ id: pharmacyMedicineRecall.id, reference: pharmacyMedicineRecall.reference, reason: pharmacyMedicineRecall.reason, status: pharmacyMedicineRecall.status, initiatedAt: pharmacyMedicineRecall.initiatedAt, resolvedAt: pharmacyMedicineRecall.resolvedAt, resolutionNotes: pharmacyMedicineRecall.resolutionNotes, branchId: branch.id, branchName: branch.name, productName: product.name, lotId: inventoryLot.id, lotNumber: inventoryLot.lotNumber, quantity: inventoryLot.quantity, expiresAt: inventoryLot.expiresAt })
    .from(pharmacyMedicineRecall).innerJoin(branch, and(eq(branch.id, pharmacyMedicineRecall.branchId), eq(branch.organizationId, orgId))).innerJoin(product, and(eq(product.id, pharmacyMedicineRecall.productId), eq(product.orgId, orgId))).innerJoin(inventoryLot, and(eq(inventoryLot.id, pharmacyMedicineRecall.lotId), eq(inventoryLot.orgId, orgId)))
    .where(and(eq(pharmacyMedicineRecall.organizationId, orgId), authorization.isOrganizationWide ? undefined : inArray(pharmacyMedicineRecall.branchId, authorization.branchIds.length ? authorization.branchIds : ['']))).orderBy(sql`${pharmacyMedicineRecall.status} asc`, sql`${pharmacyMedicineRecall.initiatedAt} desc`)
  const affected = rows.length ? await db.select({ lotId: saleItemLotAllocation.lotId, saleId: sale.id, receiptNo: sale.receiptNo, soldAt: sale.createdAt, customerName: customer.name, customerPhone: customer.phone, quantity: sql<string>`sum(${saleItemLotAllocation.quantity})` }).from(saleItemLotAllocation).innerJoin(sale, and(eq(sale.id, saleItemLotAllocation.saleId), eq(sale.orgId, orgId))).leftJoin(customer, and(eq(customer.id, sale.customerId), eq(customer.orgId, orgId))).where(and(eq(saleItemLotAllocation.organizationId, orgId), inArray(saleItemLotAllocation.lotId, rows.map((row) => row.lotId)))).groupBy(saleItemLotAllocation.lotId, sale.id, sale.receiptNo, sale.createdAt, customer.name, customer.phone).orderBy(sql`${sale.createdAt} desc`).limit(500) : []
  const affectedByLot = new Map<string, typeof affected>()
  for (const item of affected) affectedByLot.set(item.lotId, [...(affectedByLot.get(item.lotId) ?? []), item])
  return { canManage: authorization.permissions.includes(PermissionEnum.PHARMACY_RECALL_MANAGE), recalls: rows.map((row) => ({ ...row, quantity: Number(row.quantity), affectedSales: affectedByLot.get(row.lotId)?.length ?? 0, affectedReceipts: (affectedByLot.get(row.lotId) ?? []).map((item) => ({ ...item, quantity: Number(item.quantity) })) })) }
}

export async function getPharmacyInventoryReconciliation() {
  const { authorization, orgId } = await pharmacyContext(PermissionEnum.BATCH_TRACKING_VIEW)
  const rows = await db.select({ productId: product.id, productName: product.name, branchId: branch.id, branchName: branch.name, onHand: inventoryBalance.onHand, unavailable: inventoryBalance.unavailable, lotTotal: sql<string>`coalesce(sum(${inventoryLot.quantity}), 0)`, unavailableLotTotal: sql<string>`coalesce(sum(case when ${inventoryLot.status} <> 'available' then ${inventoryLot.quantity} else 0 end), 0)`, missingExpiry: sql<number>`count(*) filter (where ${inventoryLot.expiresAt} is null and ${inventoryLot.quantity} > 0)`, negativeLots: sql<number>`count(*) filter (where ${inventoryLot.quantity} < 0)` })
    .from(inventoryBalance).innerJoin(product, and(eq(product.id, inventoryBalance.productId), eq(product.orgId, orgId))).innerJoin(pharmacyProduct, and(eq(pharmacyProduct.productId, product.id), eq(pharmacyProduct.organizationId, orgId))).innerJoin(branch, and(eq(branch.id, inventoryBalance.branchId), eq(branch.organizationId, orgId))).leftJoin(inventoryLot, and(eq(inventoryLot.productId, product.id), eq(inventoryLot.branchId, branch.id), eq(inventoryLot.orgId, orgId))).where(and(eq(inventoryBalance.orgId, orgId), authorization.isOrganizationWide ? undefined : inArray(inventoryBalance.branchId, authorization.branchIds.length ? authorization.branchIds : ['']))).groupBy(product.id, product.name, branch.id, branch.name, inventoryBalance.onHand, inventoryBalance.unavailable).orderBy(product.name, branch.name)
  return rows.map((row) => { const onHand = Number(row.onHand); const unavailable = Number(row.unavailable); const lotTotal = Number(row.lotTotal); const unavailableLotTotal = Number(row.unavailableLotTotal); return { ...row, onHand, unavailable, lotTotal, unavailableLotTotal, missingExpiry: Number(row.missingExpiry), negativeLots: Number(row.negativeLots), quantityVariance: onHand - lotTotal, unavailableVariance: unavailable - unavailableLotTotal, healthy: Math.abs(onHand - lotTotal) < 0.001 && Math.abs(unavailable - unavailableLotTotal) < 0.001 && Number(row.missingExpiry) === 0 && Number(row.negativeLots) === 0 } })
}
