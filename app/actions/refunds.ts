'use server'

import { db } from '@/lib/db'
import {
  auditEvent,
  inventoryBalance,
  organization,
  pharmacyReturnDisposition,
  sale,
  saleItem,
  saleItemLotAllocation,
  salesReturn,
  salesReturnItem,
  posSession,
} from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { revalidatePath } from 'next/cache'
import { calculateRefundAmount, roundCurrency } from '@/lib/pos/refund-calculation'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { applyInventoryMovement } from '@/lib/inventory/inventory-service'
import { enqueueEtimsCreditNote } from '@/lib/etims/service'
import { isPharmacyBusiness, planReturnedLotTrace } from '@/lib/pharmacy/rules'
import { money } from '@/lib/rewards/rules'
import { reverseRewardsForReturn } from '@/lib/services/rewards-service'

interface RefundItem {
  saleItemId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export async function processRefund(data: {
  saleId: string
  receiptNo: string
  items: RefundItem[]
  totalAmount: number
  refundMethod: 'cash' | 'mpesa' | 'credit'
  refundReference?: string
  reason: string
}) {
  const posAuthorization = await getPosAuthorizationContext()
  const authorization = posAuthorization ?? await requirePermission(PermissionEnum.SALE_REFUND)
  if (!authorization.permissions.includes(PermissionEnum.SALE_REFUND)) throw new Error('Supervisor or manager approval is required for refunds')
  const userId = authorization.userId
  const orgId = authorization.organizationId

  const [workspace] = await db.select({
    businessType: organization.businessType,
    businessCategory: organization.businessCategory,
  }).from(organization).where(eq(organization.id, orgId)).limit(1)
  const pharmacyWorkspace = Boolean(workspace && isPharmacyBusiness(workspace.businessType, workspace.businessCategory))

  // Get the original sale
  const [originalSale] = await db.select().from(sale).where(and(eq(sale.id, data.saleId), eq(sale.orgId, orgId))).limit(1)
  if (!originalSale) throw new Error('Sale not found')
  if (!originalSale.branchId) throw new Error('The original sale has no inventory location')
  if (originalSale.receiptNo !== data.receiptNo) throw new Error('Receipt does not match this sale')
  if (!data.reason.trim() || data.reason.trim().length < 3) throw new Error('Enter a refund reason')
  if (!data.items.length) throw new Error('Select at least one item to refund')
  if (!['cash', 'mpesa', 'credit'].includes(data.refundMethod)) throw new Error('Invalid refund method')
  const refundReference = data.refundReference?.trim().slice(0, 120) || ''
  if (data.refundMethod === 'mpesa' && !refundReference) throw new Error('Enter the confirmed M-Pesa refund reference')
  const originalItems = await db.select().from(saleItem).where(and(eq(saleItem.saleId, data.saleId), eq(saleItem.orgId, orgId)))
  const originalById = new Map(originalItems.map((item) => [item.id, item]))
  const originalSubtotal = Number(originalSale.subtotal)
  const originalTotal = Number(originalSale.total)
  if (!Number.isFinite(originalSubtotal) || originalSubtotal <= 0 || !Number.isFinite(originalTotal)) throw new Error('The original sale total is invalid')
  for (const requested of data.items) {
    const original = originalById.get(requested.saleItemId)
    if (!original || original.productId !== requested.productId || !Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > original.quantity) throw new Error('Invalid refund item or quantity')
  }
  const verifiedTotal = calculateRefundAmount(originalSubtotal, originalTotal, data.items.map((requested) => {
    const original = originalById.get(requested.saleItemId)!
    return { lineSubtotal: Number(original.totalPrice), soldQuantity: original.quantity, refundQuantity: requested.quantity }
  }))
  const refundLineAmounts = data.items.map((requested) => {
    const original = originalById.get(requested.saleItemId)!
    return calculateRefundAmount(originalSubtotal, originalTotal, [{
      lineSubtotal: Number(original.totalPrice), soldQuantity: original.quantity, refundQuantity: requested.quantity,
    }])
  })
  const lineRoundingDifference = verifiedTotal - refundLineAmounts.reduce((sum, amount) => sum + amount, 0)
  refundLineAmounts[refundLineAmounts.length - 1] = roundCurrency(refundLineAmounts[refundLineAmounts.length - 1] + lineRoundingDifference)
  if (Math.abs(verifiedTotal - data.totalAmount) > 0.01) throw new Error('Refund amount does not match the selected sale items')

  const returnId = generateId()
  const returnNo = `RET-${Date.now().toString().slice(-6)}`

  await db.transaction(async (tx) => {
    // POS refunds belong to the drawer currently in use, not to the original
    // sale's shift. Resolve that session from the trusted terminal credential.
    let refundSessionId: string | null = null
    let refundTerminalId: string | null = null
    if (posAuthorization) {
      if (originalSale.branchId !== posAuthorization.branchId)
        throw new Error('This refund belongs to a different terminal branch')
      const [activeShift] = await tx.select({ id: posSession.id, terminalId: posSession.terminalId }).from(posSession).where(and(
        eq(posSession.orgId, orgId),
        eq(posSession.branchId, posAuthorization.branchId),
        eq(posSession.terminalId, posAuthorization.terminalId),
        eq(posSession.openedBy, userId),
        eq(posSession.status, 'open'),
      )).limit(1).for('update')
      if (!activeShift) throw new Error('Open this terminal shift before processing a refund')
      refundSessionId = activeShift.id
      refundTerminalId = posAuthorization.terminalId
    } else if (data.refundMethod === 'cash') {
      // Dashboard cash refunds still need an accountable open drawer.
      const [activeShift] = await tx.select({ id: posSession.id, terminalId: posSession.terminalId }).from(posSession).where(and(
        eq(posSession.orgId, orgId), eq(posSession.branchId, originalSale.branchId!),
        eq(posSession.openedBy, userId), eq(posSession.status, 'open'),
      )).limit(1).for('update')
      if (!activeShift) throw new Error('Open a shift before issuing a cash refund')
      refundSessionId = activeShift.id
      refundTerminalId = activeShift.terminalId
    }
    // Serialize refunds for this sale so two terminals cannot return the same units.
    await tx.execute(sql`select ${sale.id} from ${sale} where ${sale.id} = ${data.saleId} and ${sale.orgId} = ${orgId} for update`)
    const previousReturns = await tx.select({
      productId: salesReturnItem.productId,
      quantity: sql<number>`coalesce(sum(${salesReturnItem.quantity}), 0)`,
    }).from(salesReturnItem)
      .innerJoin(salesReturn, eq(salesReturnItem.returnId, salesReturn.id))
      .where(and(eq(salesReturn.saleId, data.saleId), eq(salesReturn.orgId, orgId), eq(salesReturn.status, 'completed')))
      .groupBy(salesReturnItem.productId)
    const previouslyReturned = new Map(previousReturns.map((item) => [item.productId, Number(item.quantity)]))
    const previousReturnsBySaleItem = await tx.select({
      saleItemId: salesReturnItem.originalSaleItemId,
      quantity: sql<number>`coalesce(sum(${salesReturnItem.quantity}), 0)`,
    }).from(salesReturnItem)
      .innerJoin(salesReturn, eq(salesReturnItem.returnId, salesReturn.id))
      .where(and(
        eq(salesReturn.saleId, data.saleId),
        eq(salesReturn.orgId, orgId),
        eq(salesReturn.status, 'completed'),
        sql`${salesReturnItem.originalSaleItemId} is not null`,
      ))
      .groupBy(salesReturnItem.originalSaleItemId)
    const returnedBySaleItem = new Map(previousReturnsBySaleItem.map((item) => [item.saleItemId!, Number(item.quantity)]))

    for (const requested of data.items) {
      const original = originalById.get(requested.saleItemId)!
      const returnedQuantity = returnedBySaleItem.has(original.id)
        ? returnedBySaleItem.get(original.id)!
        : (previouslyReturned.get(original.productId) ?? 0)
      const remaining = original.quantity - returnedQuantity
      if (requested.quantity > remaining) throw new Error(`Only ${remaining} ${original.productName} can still be refunded`)
    }

    // Create sales return record
    await tx.insert(salesReturn).values({
      id: returnId,
      returnNo,
      saleId: data.saleId,
      receiptNo: data.receiptNo,
      amount: String(verifiedTotal),
      refundMethod: data.refundMethod,
      reason: data.reason,
      status: 'completed',
      userId,
      orgId,
      posSessionId: refundSessionId,
      terminalId: refundTerminalId,
    })

    // Process each returned item
    for (const [itemIndex, item] of data.items.entries()) {
      const original = originalById.get(item.saleItemId)!
      const lineRefundTotal = refundLineAmounts[itemIndex]
      // Add sales return item record
      const returnItemId = generateId()
      await tx.insert(salesReturnItem).values({
        id: returnItemId,
        returnId,
        originalSaleItemId: original.id,
        productId: original.productId,
        productName: original.productName,
        quantity: item.quantity,
        unitPrice: String(lineRefundTotal / item.quantity),
        total: String(lineRefundTotal),
        disposition: pharmacyWorkspace ? 'quarantined' : 'restock',
        orgId,
      })

      const returnedBaseQuantity = item.quantity * original.baseUnitQuantity
      await applyInventoryMovement(tx, { productId: original.productId, productName: original.productName, branchId: originalSale.branchId!, quantity: returnedBaseQuantity, type: 'return', referenceType: 'refund', referenceId: returnId, reason: `Refund: ${data.reason}`, userId, orgId })

      if (pharmacyWorkspace) {
        await tx.update(inventoryBalance).set({
          unavailable: sql`${inventoryBalance.unavailable} + ${returnedBaseQuantity}`,
          updatedAt: new Date(),
        }).where(and(
          eq(inventoryBalance.productId, original.productId),
          eq(inventoryBalance.branchId, originalSale.branchId!),
          eq(inventoryBalance.orgId, orgId),
        ))

        const originalAllocations = await tx.select().from(saleItemLotAllocation).where(and(
          eq(saleItemLotAllocation.organizationId, orgId),
          eq(saleItemLotAllocation.saleItemId, original.id),
        )).orderBy(saleItemLotAllocation.createdAt)
        const priorDispositionRows = await tx.select({
          allocationId: pharmacyReturnDisposition.originalAllocationId,
          quantity: sql<number>`coalesce(sum(${pharmacyReturnDisposition.quantity}), 0)`,
        }).from(pharmacyReturnDisposition).where(and(
          eq(pharmacyReturnDisposition.organizationId, orgId),
          eq(pharmacyReturnDisposition.originalSaleItemId, original.id),
        )).groupBy(pharmacyReturnDisposition.originalAllocationId)
        const alreadyReturnedByAllocation = new Map(priorDispositionRows.map((row) => [row.allocationId, Number(row.quantity)]))
        const tracePlan = planReturnedLotTrace(originalAllocations.map((allocation) => ({
          id: allocation.id,
          quantity: Number(allocation.quantity),
          alreadyReturned: alreadyReturnedByAllocation.get(allocation.id) ?? 0,
        })), returnedBaseQuantity)
        const allocationById = new Map(originalAllocations.map((allocation) => [allocation.id, allocation]))
        for (const traced of tracePlan.traced) {
          const allocation = allocationById.get(traced.allocationId)!
          await tx.insert(pharmacyReturnDisposition).values({
            id: generateId(), organizationId: orgId, branchId: originalSale.branchId!, returnId, returnItemId,
            originalSaleItemId: original.id, originalAllocationId: allocation.id, productId: original.productId,
            originalLotId: allocation.lotId, lotNumber: allocation.lotNumber, quantity: String(traced.quantity),
            status: 'quarantined', notes: data.reason, createdBy: userId,
          })
        }
        if (tracePlan.untracedQuantity > 0) {
          await tx.insert(pharmacyReturnDisposition).values({
            id: generateId(), organizationId: orgId, branchId: originalSale.branchId!, returnId, returnItemId,
            originalSaleItemId: original.id, productId: original.productId, quantity: String(tracePlan.untracedQuantity),
            status: 'quarantined', notes: `${data.reason} — original batch trace unavailable`, createdBy: userId,
          })
        }
      }
    }

    const allItemsReturned = originalItems.every((item) =>
      (returnedBySaleItem.has(item.id) ? returnedBySaleItem.get(item.id)! : (previouslyReturned.get(item.productId) ?? 0))
        + (data.items.find((requested) => requested.saleItemId === item.id)?.quantity ?? 0) >= item.quantity
    )
    await tx.update(sale).set({ status: allItemsReturned ? 'refunded' : 'partially_refunded' })
      .where(and(eq(sale.id, data.saleId), eq(sale.orgId, orgId)))

    const returnedEligibleSpend = money(data.items.reduce((sum, requested) => {
      const original = originalById.get(requested.saleItemId)!
      return sum + (Number(original.rewardEligibleAmount) * requested.quantity / original.quantity)
    }, 0))
    const rewardReversal = await reverseRewardsForReturn(tx, {
      organizationId: orgId,
      saleId: data.saleId,
      returnId,
      branchId: originalSale.branchId!,
      userId,
      returnedEligibleSpend,
    })
    await tx.update(salesReturn).set({
      pointsEarnedReversed: rewardReversal.pointsEarnedReversed,
      pointsRedeemedRestored: rewardReversal.pointsRedeemedRestored,
      bonusRestored: String(rewardReversal.bonusRestored),
      rewardEligibleSpendReversed: String(returnedEligibleSpend),
      rewardEffectsAppliedAt: new Date(),
    }).where(and(eq(salesReturn.id, returnId), eq(salesReturn.orgId, orgId)))

    // Create audit event
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'refund_processed',
      metadata: {
        returnId,
        returnNo,
        saleId: data.saleId,
        receiptNo: data.receiptNo,
        amount: verifiedTotal,
        method: data.refundMethod,
        reference: refundReference || null,
        itemsCount: data.items.length,
        reason: data.reason,
        pharmacyDisposition: pharmacyWorkspace ? 'quarantined' : 'restock',
        rewardReversal: { ...rewardReversal, returnedEligibleSpend },
      },
    })
  })

  await invalidateProductReadCache(orgId)
  revalidatePath('/dashboard/pos')
  revalidatePath('/dashboard/pos/history')
  revalidatePath('/dashboard/sales')
  let etimsCreditNote: Awaited<ReturnType<typeof enqueueEtimsCreditNote>> | { status: 'FAILED'; message: string }
  try { etimsCreditNote = await enqueueEtimsCreditNote(returnId, userId) }
  catch { etimsCreditNote = { status: 'FAILED', message: 'Refund completed. The eTIMS credit note requires administrative review.' } }
  return { returnId, returnNo, status: 'success', etimsCreditNote }
}

export async function getRefundHistory(saleId: string) {
  const posAuthorization = await getPosAuthorizationContext()
  const authorization = posAuthorization ?? await requirePermission(PermissionEnum.SALE_REFUND)
  if (!authorization.permissions.includes(PermissionEnum.SALE_REFUND)) throw new Error('Refund permission denied')
  const orgId = authorization.organizationId

  const returns = await db.select().from(salesReturn).where(and(eq(salesReturn.saleId, saleId), eq(salesReturn.orgId, orgId)))

  return returns
}
