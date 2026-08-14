'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  branch, inventoryLot, inventorySerial, inventoryTransfer, inventoryTransferItem, product, productPackaging,
  purchaseOrder, purchaseOrderItem, purchaseReceipt, purchaseReceiptItem, supplier,
} from '@/lib/db/schema'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { addCostLayer, adjustIncoming, applyInventoryMovement, releaseReservation, reserveInventory } from '@/lib/inventory/inventory-service'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { generateId } from '@/lib/utils'

const poLine = z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().positive().max(1_000_000), unitCost: z.coerce.number().nonnegative(), packagingId: z.string().optional() })
const createPoSchema = z.object({ supplierId: z.string().min(1), branchId: z.string().min(1), expectedDelivery: z.coerce.date().optional(), notes: z.string().trim().max(500).optional(), shippingAmount: z.coerce.number().nonnegative().default(0), otherCosts: z.coerce.number().nonnegative().default(0), items: z.array(poLine).min(1).max(500) })
const receiptLine = z.object({ poItemId: z.string().min(1), acceptedQuantity: z.coerce.number().int().nonnegative(), rejectedQuantity: z.coerce.number().int().nonnegative().default(0), rejectionReason: z.string().trim().max(200).optional(), lotNumber: z.string().trim().max(100).optional(), expiresAt: z.coerce.date().optional(), serialNumbers: z.array(z.string().trim().min(1).max(120)).max(1000).default([]) }).refine((line) => line.acceptedQuantity + line.rejectedQuantity > 0, 'Enter a received or rejected quantity')
const receivePoSchema = z.object({ poId: z.string().min(1), idempotencyKey: z.string().min(8).max(100), supplierInvoice: z.string().trim().max(100).optional(), notes: z.string().trim().max(500).optional(), items: z.array(receiptLine).min(1).max(500) })
const transferLine = z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().positive().max(1_000_000) })
const createTransferSchema = z.object({ fromBranchId: z.string().min(1), toBranchId: z.string().min(1), reference: z.string().trim().max(100).optional(), notes: z.string().trim().max(500).optional(), items: z.array(transferLine).min(1).max(500) }).refine((value) => value.fromBranchId !== value.toBranchId, 'Choose different source and destination locations')
const receiveTransferSchema = z.object({ transferId: z.string().min(1), idempotencyKey: z.string().min(8).max(100), items: z.array(z.object({ itemId: z.string().min(1), receivedQuantity: z.coerce.number().int().nonnegative(), rejectedQuantity: z.coerce.number().int().nonnegative().default(0) })).min(1) })

async function lifecycleContext(permission: PermissionEnum) {
  const authorization = await requirePermission(permission)
  return { authorization, userId: authorization.userId, orgId: authorization.organizationId }
}

function assertBranchAccess(authorization: Awaited<ReturnType<typeof requirePermission>>, ...branchIds: string[]) {
  if (!authorization.isOrganizationWide && branchIds.some((id) => !authorization.branchIds.includes(id))) throw new Error('You do not have access to this inventory location')
}

function refreshInventory() {
  for (const path of ['/dashboard', '/dashboard/inventory', '/dashboard/purchases', '/dashboard/products', '/dashboard/reports']) revalidatePath(path)
}

export async function getInventoryLifecycleData() {
  const { authorization, orgId } = await lifecycleContext(PermissionEnum.INVENTORY_VIEW)
  const branchCondition = authorization.isOrganizationWide ? undefined : inArray(branch.id, authorization.branchIds.length ? authorization.branchIds : [''])
  const canViewPurchases = authorization.permissions.includes(PermissionEnum.PURCHASE_VIEW)
  const [purchaseOrders, poItems, transfers, transferItems, branches] = await Promise.all([
    canViewPurchases ? db.select().from(purchaseOrder).where(eq(purchaseOrder.orgId, orgId)).orderBy(desc(purchaseOrder.createdAt)).limit(100) : Promise.resolve([]),
    canViewPurchases ? db.select().from(purchaseOrderItem).where(eq(purchaseOrderItem.orgId, orgId)) : Promise.resolve([]),
    db.select().from(inventoryTransfer).where(eq(inventoryTransfer.orgId, orgId)).orderBy(desc(inventoryTransfer.createdAt)).limit(100),
    db.select().from(inventoryTransferItem).where(eq(inventoryTransferItem.orgId, orgId)),
    db.select().from(branch).where(and(eq(branch.organizationId, orgId), branchCondition)).orderBy(desc(branch.isMain), branch.name),
  ])
  return { purchaseOrders, poItems, transfers, transferItems, branches }
}

export async function createPurchaseOrder(input: z.input<typeof createPoSchema>) {
  const data = createPoSchema.parse(input)
  const { authorization, userId, orgId } = await lifecycleContext(PermissionEnum.PURCHASE_MANAGE)
  assertBranchAccess(authorization, data.branchId)
  if (new Set(data.items.map((item) => item.productId)).size !== data.items.length) throw new Error('Each product can appear only once')
  const [location, vendor, products] = await Promise.all([
    db.select({ id: branch.id }).from(branch).where(and(eq(branch.id, data.branchId), eq(branch.organizationId, orgId))).limit(1),
    db.select({ id: supplier.id }).from(supplier).where(and(eq(supplier.id, data.supplierId), eq(supplier.orgId, orgId), eq(supplier.status, 'active'))).limit(1),
    db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true), inArray(product.id, data.items.map((item) => item.productId)))),
  ])
  if (!location[0] || !vendor[0] || products.length !== data.items.length) throw new Error('A location, supplier, or product is unavailable')
  const byId = new Map(products.map((item) => [item.id, item]))
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  const id = generateId(), poNo = `PO-${Date.now().toString(36).toUpperCase()}`
  await db.transaction(async (tx) => {
    await tx.insert(purchaseOrder).values({ id, poNo, supplierId: data.supplierId, branchId: data.branchId, subtotal: String(subtotal), total: String(subtotal + data.shippingAmount + data.otherCosts), shippingAmount: String(data.shippingAmount), otherCosts: String(data.otherCosts), expectedDelivery: data.expectedDelivery, notes: data.notes, status: 'draft', userId, orgId })
    await tx.insert(purchaseOrderItem).values(data.items.map((line) => ({ id: generateId(), poId: id, productId: line.productId, description: byId.get(line.productId)!.name, quantity: line.quantity, unitPrice: String(line.unitCost), total: String(line.quantity * line.unitCost), packagingId: line.packagingId || null, orgId })))
  })
  refreshInventory()
  return { id, poNo }
}

export async function setPurchaseOrderStatus(poId: string, next: 'sent' | 'confirmed' | 'cancelled') {
  const id = z.string().min(1).parse(poId)
  const { authorization, orgId } = await lifecycleContext(PermissionEnum.PURCHASE_MANAGE)
  const [record] = await db.select().from(purchaseOrder).where(and(eq(purchaseOrder.id, id), eq(purchaseOrder.orgId, orgId))).limit(1)
  if (!record || !record.branchId) throw new Error('Purchase order not found')
  assertBranchAccess(authorization, record.branchId)
  const allowed: Record<string, string[]> = { draft: ['sent', 'confirmed', 'cancelled'], sent: ['confirmed', 'cancelled'], confirmed: ['cancelled'] }
  if (!allowed[record.status]?.includes(next)) throw new Error(`Cannot change ${record.status} order to ${next}`)
  await db.transaction(async (tx) => {
    const [changed] = await tx.update(purchaseOrder).set({ status: next, sentAt: next === 'sent' ? new Date() : record.sentAt, confirmedAt: next === 'confirmed' ? new Date() : record.confirmedAt, closedAt: next === 'cancelled' ? new Date() : null, updatedAt: new Date() }).where(and(eq(purchaseOrder.id, id), eq(purchaseOrder.orgId, orgId), eq(purchaseOrder.status, record.status))).returning({ id: purchaseOrder.id })
    if (!changed) throw new Error('Purchase order changed; refresh and retry')
    const lines = await tx.select().from(purchaseOrderItem).where(and(eq(purchaseOrderItem.poId, id), eq(purchaseOrderItem.orgId, orgId)))
    if (next === 'confirmed') for (const line of lines) if (line.productId) await adjustIncoming(tx, { productId: line.productId, branchId: record.branchId!, orgId, quantity: line.quantity })
    if (next === 'cancelled' && record.status === 'confirmed') for (const line of lines) if (line.productId) await adjustIncoming(tx, { productId: line.productId, branchId: record.branchId!, orgId, quantity: -(line.quantity - Number(line.receivedQuantity)) })
  })
  refreshInventory()
}

export async function receivePurchaseOrder(input: z.input<typeof receivePoSchema>) {
  const data = receivePoSchema.parse(input)
  const { authorization, userId, orgId } = await lifecycleContext(PermissionEnum.PURCHASE_MANAGE)
  const [record] = await db.select().from(purchaseOrder).where(and(eq(purchaseOrder.id, data.poId), eq(purchaseOrder.orgId, orgId))).limit(1)
  if (!record?.branchId || !['confirmed', 'partially_received'].includes(record.status)) throw new Error('Purchase order is not ready to receive')
  assertBranchAccess(authorization, record.branchId)
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: purchaseReceipt.id }).from(purchaseReceipt).where(and(eq(purchaseReceipt.orgId, orgId), eq(purchaseReceipt.idempotencyKey, data.idempotencyKey))).limit(1)
    if (existing[0]) return
    await tx.execute(sql`select ${purchaseOrder.id} from ${purchaseOrder} where ${purchaseOrder.id} = ${record.id} for update`)
    const lines = await tx.select().from(purchaseOrderItem).where(and(eq(purchaseOrderItem.poId, record.id), eq(purchaseOrderItem.orgId, orgId), inArray(purchaseOrderItem.id, data.items.map((item) => item.poItemId))))
    if (lines.length !== data.items.length) throw new Error('One or more purchase-order lines are invalid')
    const requested = new Map(data.items.map((item) => [item.poItemId, item]))
    const products = await tx.select().from(product).where(and(eq(product.orgId, orgId), inArray(product.id, lines.map((line) => line.productId!).filter(Boolean))))
    const byProduct = new Map(products.map((item) => [item.id, item]))
    const receiptId = generateId(), receiptNo = `GRN-${Date.now().toString(36).toUpperCase()}`
    await tx.insert(purchaseReceipt).values({ id: receiptId, receiptNo, poId: record.id, branchId: record.branchId!, supplierInvoice: data.supplierInvoice, idempotencyKey: data.idempotencyKey, notes: data.notes, receivedBy: userId, orgId })
    for (const line of lines) {
      const item = requested.get(line.id)!, remaining = line.quantity - Number(line.receivedQuantity) - Number(line.rejectedQuantity)
      if (item.acceptedQuantity + item.rejectedQuantity > remaining) throw new Error(`${line.description}: only ${remaining} remains open`)
      if (!line.productId) throw new Error(`${line.description} has no inventory product`)
      const itemProduct = byProduct.get(line.productId)
      if (!itemProduct) throw new Error(`${line.description} is unavailable`)
      const [pack] = line.packagingId ? await tx.select().from(productPackaging).where(and(eq(productPackaging.id, line.packagingId), eq(productPackaging.productId, line.productId), eq(productPackaging.orgId, orgId))).limit(1) : []
      const multiplier = Number(pack?.quantityInBaseUnit ?? 1), baseQuantity = item.acceptedQuantity * multiplier
      if (itemProduct.trackingMode === 'lot' && (!item.lotNumber || !item.expiresAt)) throw new Error(`${line.description} requires a lot and expiry date`)
      if (itemProduct.trackingMode === 'serial' && item.serialNumbers.length !== baseQuantity) throw new Error(`${line.description} requires one serial number per received unit`)
      await tx.insert(purchaseReceiptItem).values({ id: generateId(), receiptId, poItemId: line.id, productId: line.productId, acceptedQuantity: String(item.acceptedQuantity), rejectedQuantity: String(item.rejectedQuantity), rejectionReason: item.rejectionReason, baseQuantity: String(baseQuantity), unitCost: line.unitPrice, lotNumber: item.lotNumber, expiresAt: item.expiresAt, orgId })
      await tx.update(purchaseOrderItem).set({ receivedQuantity: sql`${purchaseOrderItem.receivedQuantity} + ${item.acceptedQuantity}`, rejectedQuantity: sql`${purchaseOrderItem.rejectedQuantity} + ${item.rejectedQuantity}` }).where(eq(purchaseOrderItem.id, line.id))
      await adjustIncoming(tx, { productId: line.productId, branchId: record.branchId!, orgId, quantity: -(item.acceptedQuantity + item.rejectedQuantity) })
      if (baseQuantity) {
        await applyInventoryMovement(tx, { productId: line.productId, productName: itemProduct.name, branchId: record.branchId!, quantity: baseQuantity, type: 'purchase_receipt', referenceType: 'purchase_receipt', referenceId: receiptId, reason: data.supplierInvoice || receiptNo, userId, orgId, unitCost: Number(line.unitPrice) / multiplier })
        await addCostLayer(tx, { productId: line.productId, branchId: record.branchId!, sourceType: 'purchase_receipt', sourceId: receiptId, quantity: baseQuantity, unitCost: Number(line.unitPrice) / multiplier, orgId })
        if (item.lotNumber) await tx.insert(inventoryLot).values({ id: generateId(), productId: line.productId, branchId: record.branchId!, lotNumber: item.lotNumber, quantity: String(baseQuantity), expiresAt: item.expiresAt, alertAt: item.expiresAt && itemProduct.expiryAlertDays ? new Date(item.expiresAt.getTime() - itemProduct.expiryAlertDays * 86_400_000) : null, supplierId: record.supplierId, unitCost: String(Number(line.unitPrice) / multiplier), orgId }).onConflictDoUpdate({ target: [inventoryLot.productId, inventoryLot.branchId, inventoryLot.lotNumber], set: { quantity: sql`${inventoryLot.quantity} + ${baseQuantity}` } })
        if (item.serialNumbers.length) await tx.insert(inventorySerial).values(item.serialNumbers.map((serialNumber) => ({ id: generateId(), productId: line.productId!, branchId: record.branchId!, serialNumber, orgId })))
      }
    }
    const allLines = await tx.select().from(purchaseOrderItem).where(eq(purchaseOrderItem.poId, record.id))
    const complete = allLines.every((line) => Number(line.receivedQuantity) + Number(line.rejectedQuantity) >= line.quantity)
    await tx.update(purchaseOrder).set({ status: complete ? 'received' : 'partially_received', closedAt: complete ? new Date() : null, updatedAt: new Date() }).where(eq(purchaseOrder.id, record.id))
  })
  await invalidateProductReadCache(orgId); refreshInventory()
}

export async function createInventoryTransfer(input: z.input<typeof createTransferSchema>) {
  const data = createTransferSchema.parse(input)
  const { authorization, userId, orgId } = await lifecycleContext(PermissionEnum.INVENTORY_TRANSFER)
  assertBranchAccess(authorization, data.fromBranchId, data.toBranchId)
  if (new Set(data.items.map((item) => item.productId)).size !== data.items.length) throw new Error('Each product can appear only once')
  const [locations, products] = await Promise.all([
    db.select({ id: branch.id }).from(branch).where(and(eq(branch.organizationId, orgId), inArray(branch.id, [data.fromBranchId, data.toBranchId]))),
    db.select().from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true), inArray(product.id, data.items.map((item) => item.productId)))),
  ])
  if (locations.length !== 2 || products.length !== data.items.length) throw new Error('A transfer location or product is unavailable')
  const byId = new Map(products.map((item) => [item.id, item])), id = generateId(), transferNo = `TR-${Date.now().toString(36).toUpperCase()}`
  await db.transaction(async (tx) => {
    await tx.insert(inventoryTransfer).values({ id, transferNo, fromLocation: data.fromBranchId, toLocation: data.toBranchId, reference: data.reference, notes: data.notes, userId, orgId })
    await tx.insert(inventoryTransferItem).values(data.items.map((item) => ({ id: generateId(), transferId: id, productId: item.productId, productName: byId.get(item.productId)!.name, quantity: item.quantity, orgId })))
  })
  refreshInventory(); return { id, transferNo }
}

export async function approveInventoryTransfer(transferId: string) {
  const id = z.string().min(1).parse(transferId), { authorization, userId, orgId } = await lifecycleContext(PermissionEnum.INVENTORY_TRANSFER)
  await db.transaction(async (tx) => {
    const [record] = await tx.select().from(inventoryTransfer).where(and(eq(inventoryTransfer.id, id), eq(inventoryTransfer.orgId, orgId))).limit(1)
    if (!record || record.status !== 'pending') throw new Error('Transfer is unavailable or already reviewed')
    assertBranchAccess(authorization, record.fromLocation, record.toLocation)
    const lines = await tx.select().from(inventoryTransferItem).where(and(eq(inventoryTransferItem.transferId, id), eq(inventoryTransferItem.orgId, orgId)))
    for (const line of lines) await reserveInventory(tx, { productId: line.productId, branchId: record.fromLocation, orgId, quantity: line.quantity })
    await tx.update(inventoryTransfer).set({ status: 'approved', approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() }).where(and(eq(inventoryTransfer.id, id), eq(inventoryTransfer.status, 'pending')))
  })
  refreshInventory()
}

export async function dispatchInventoryTransfer(transferId: string, trackingNumber?: string) {
  const id = z.string().min(1).parse(transferId), tracking = z.string().trim().max(100).optional().parse(trackingNumber), { authorization, userId, orgId } = await lifecycleContext(PermissionEnum.INVENTORY_TRANSFER)
  await db.transaction(async (tx) => {
    const [record] = await tx.select().from(inventoryTransfer).where(and(eq(inventoryTransfer.id, id), eq(inventoryTransfer.orgId, orgId))).limit(1)
    if (!record || record.status !== 'approved') throw new Error('Only an approved transfer can be dispatched')
    assertBranchAccess(authorization, record.fromLocation, record.toLocation)
    const lines = await tx.select().from(inventoryTransferItem).where(eq(inventoryTransferItem.transferId, id))
    for (const line of lines) {
      await releaseReservation(tx, { productId: line.productId, branchId: record.fromLocation, orgId, quantity: line.quantity })
      await applyInventoryMovement(tx, { productId: line.productId, productName: line.productName, branchId: record.fromLocation, quantity: -line.quantity, type: 'transfer_dispatch', referenceType: 'inventory_transfer', referenceId: id, reason: record.transferNo, userId, orgId })
      await adjustIncoming(tx, { productId: line.productId, branchId: record.toLocation, orgId, quantity: line.quantity })
      await tx.update(inventoryTransferItem).set({ dispatchedQuantity: String(line.quantity) }).where(eq(inventoryTransferItem.id, line.id))
    }
    await tx.update(inventoryTransfer).set({ status: 'in_transit', dispatchedBy: userId, dispatchedAt: new Date(), trackingNumber: tracking, updatedAt: new Date() }).where(and(eq(inventoryTransfer.id, id), eq(inventoryTransfer.status, 'approved')))
  })
  await invalidateProductReadCache(orgId); refreshInventory()
}

export async function receiveInventoryTransfer(input: z.input<typeof receiveTransferSchema>) {
  const data = receiveTransferSchema.parse(input), { authorization, userId, orgId } = await lifecycleContext(PermissionEnum.INVENTORY_TRANSFER)
  await db.transaction(async (tx) => {
    const [record] = await tx.select().from(inventoryTransfer).where(and(eq(inventoryTransfer.id, data.transferId), eq(inventoryTransfer.orgId, orgId))).limit(1)
    if (!record || !['in_transit', 'partially_received'].includes(record.status)) throw new Error('Transfer is not ready to receive')
    assertBranchAccess(authorization, record.toLocation)
    if (record.idempotencyKey === data.idempotencyKey) return
    await tx.execute(sql`select ${inventoryTransfer.id} from ${inventoryTransfer} where ${inventoryTransfer.id} = ${record.id} for update`)
    const lines = await tx.select().from(inventoryTransferItem).where(and(eq(inventoryTransferItem.transferId, record.id), inArray(inventoryTransferItem.id, data.items.map((item) => item.itemId))))
    if (lines.length !== data.items.length) throw new Error('A transfer line is invalid')
    const requested = new Map(data.items.map((item) => [item.itemId, item]))
    for (const line of lines) {
      const item = requested.get(line.id)!, remaining = Number(line.dispatchedQuantity) - Number(line.receivedQuantity) - Number(line.rejectedQuantity)
      if (item.receivedQuantity + item.rejectedQuantity > remaining) throw new Error(`${line.productName}: only ${remaining} remains in transit`)
      await adjustIncoming(tx, { productId: line.productId, branchId: record.toLocation, orgId, quantity: -(item.receivedQuantity + item.rejectedQuantity) })
      if (item.receivedQuantity) await applyInventoryMovement(tx, { productId: line.productId, productName: line.productName, branchId: record.toLocation, quantity: item.receivedQuantity, type: 'transfer_receipt', referenceType: 'inventory_transfer', referenceId: record.id, reason: record.transferNo, userId, orgId })
      await tx.update(inventoryTransferItem).set({ receivedQuantity: sql`${inventoryTransferItem.receivedQuantity} + ${item.receivedQuantity}`, rejectedQuantity: sql`${inventoryTransferItem.rejectedQuantity} + ${item.rejectedQuantity}` }).where(eq(inventoryTransferItem.id, line.id))
    }
    const all = await tx.select().from(inventoryTransferItem).where(eq(inventoryTransferItem.transferId, record.id))
    const complete = all.every((line) => Number(line.receivedQuantity) + Number(line.rejectedQuantity) >= Number(line.dispatchedQuantity))
    await tx.update(inventoryTransfer).set({ status: complete ? 'received' : 'partially_received', receivedBy: userId, receivedAt: complete ? new Date() : null, idempotencyKey: data.idempotencyKey, updatedAt: new Date() }).where(eq(inventoryTransfer.id, record.id))
  })
  await invalidateProductReadCache(orgId); refreshInventory()
}

export async function cancelInventoryTransfer(transferId: string) {
  const id = z.string().min(1).parse(transferId), { authorization, orgId } = await lifecycleContext(PermissionEnum.INVENTORY_TRANSFER)
  await db.transaction(async (tx) => {
    const [record] = await tx.select().from(inventoryTransfer).where(and(eq(inventoryTransfer.id, id), eq(inventoryTransfer.orgId, orgId))).limit(1)
    if (!record || !['pending', 'approved'].includes(record.status)) throw new Error('Only pending or approved transfers can be cancelled')
    assertBranchAccess(authorization, record.fromLocation, record.toLocation)
    if (record.status === 'approved') {
      const lines = await tx.select().from(inventoryTransferItem).where(eq(inventoryTransferItem.transferId, id))
      for (const line of lines) await releaseReservation(tx, { productId: line.productId, branchId: record.fromLocation, orgId, quantity: line.quantity })
    }
    await tx.update(inventoryTransfer).set({ status: 'cancelled', updatedAt: new Date() }).where(and(eq(inventoryTransfer.id, id), eq(inventoryTransfer.status, record.status)))
  })
  refreshInventory()
}
