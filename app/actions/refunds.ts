'use server'

import { db } from '@/lib/db'
import { sale, saleItem, salesReturn, salesReturnItem, auditEvent } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { revalidatePath } from 'next/cache'
import { calculateRefundAmount, roundCurrency } from '@/lib/pos/refund-calculation'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { applyInventoryMovement } from '@/lib/inventory/inventory-service'

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

    for (const requested of data.items) {
      const original = originalById.get(requested.saleItemId)!
      const remaining = original.quantity - (previouslyReturned.get(original.productId) ?? 0)
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
    })

    // Process each returned item
    for (const [itemIndex, item] of data.items.entries()) {
      const original = originalById.get(item.saleItemId)!
      const lineRefundTotal = refundLineAmounts[itemIndex]
      // Add sales return item record
      await tx.insert(salesReturnItem).values({
        id: generateId(),
        returnId,
        productId: original.productId,
        productName: original.productName,
        quantity: item.quantity,
        unitPrice: String(lineRefundTotal / item.quantity),
        total: String(lineRefundTotal),
        disposition: 'restock',
        orgId,
      })

      await applyInventoryMovement(tx, { productId: original.productId, productName: original.productName, branchId: originalSale.branchId!, quantity: item.quantity, type: 'return', referenceType: 'refund', referenceId: returnId, reason: `Refund: ${data.reason}`, userId, orgId })
    }

    const allItemsReturned = originalItems.every((item) =>
      (previouslyReturned.get(item.productId) ?? 0) + (data.items.find((requested) => requested.productId === item.productId)?.quantity ?? 0) >= item.quantity
    )
    await tx.update(sale).set({ status: allItemsReturned ? 'refunded' : 'partially_refunded' })
      .where(and(eq(sale.id, data.saleId), eq(sale.orgId, orgId)))

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
      },
    })
  })

  await invalidateProductReadCache(orgId)
  revalidatePath('/dashboard/pos')
  revalidatePath('/dashboard/pos/history')
  revalidatePath('/dashboard/sales')
  return { returnId, returnNo, status: 'success' }
}

export async function getRefundHistory(saleId: string) {
  const posAuthorization = await getPosAuthorizationContext()
  const authorization = posAuthorization ?? await requirePermission(PermissionEnum.SALE_REFUND)
  if (!authorization.permissions.includes(PermissionEnum.SALE_REFUND)) throw new Error('Refund permission denied')
  const orgId = authorization.organizationId

  const returns = await db.select().from(salesReturn).where(and(eq(salesReturn.saleId, saleId), eq(salesReturn.orgId, orgId)))

  return returns
}
