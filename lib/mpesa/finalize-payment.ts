import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  auditEvent, businessSettings, customer, mpesaIncomingPayment, mpesaPaymentRequest,
  posSession, product, sale, saleItem, salePayment,
} from '@/lib/db/schema'
import { calculateMpesaAmount } from '@/lib/mpesa/amount'
import { generateId, generateReceiptNo } from '@/lib/utils'
import { applyInventoryMovement, consumeInventoryCost } from '@/lib/inventory/inventory-service'

export type MpesaCheckoutPayload = {
  items: Array<{ productId: string; quantity: number }>
  discountAmount: number
  ageVerified: boolean
}

/**
 * The only M-Pesa sale finalization path. The callback calls this after persisting
 * the receipt. Claiming the request, stock deduction, sale/payment creation and
 * audit entries share one transaction, so callback retries are harmless.
 */
export async function finalizeConfirmedMpesaPayment(requestId: string) {
  const result = await db.transaction(async (tx) => {
    const [intent] = await tx.select().from(mpesaPaymentRequest)
      .where(eq(mpesaPaymentRequest.id, requestId)).limit(1).for('update')
    if (!intent) throw new Error('M-Pesa checkout was not found')
    if (intent.saleId) return { saleId: intent.saleId, alreadyFinalized: true }
    if (intent.status !== 'CONFIRMED' || !intent.receiptNumber) throw new Error('M-Pesa payment is not confirmed')
    if (!intent.branchId || !intent.posSessionId) throw new Error('M-Pesa checkout is missing branch or shift context')
    const [activeShift] = await tx.select({ id: posSession.id }).from(posSession).where(and(
      eq(posSession.id, intent.posSessionId),
      eq(posSession.orgId, intent.organizationId),
      eq(posSession.branchId, intent.branchId),
      eq(posSession.openedBy, intent.userId),
      eq(posSession.status, 'open'),
    )).limit(1).for('update')
    if (!activeShift) throw new Error('The POS shift closed before this M-Pesa payment was finalized')

    const checkout = intent.checkoutPayload as MpesaCheckoutPayload | null
    if (!checkout?.items?.length || !Number.isFinite(checkout.discountAmount)) throw new Error('M-Pesa checkout details are unavailable')
    const productIds = Array.from(new Set(checkout.items.map((line) => line.productId)))
    if (productIds.length !== checkout.items.length) throw new Error('M-Pesa basket contains duplicate items')

    const [settings] = await tx.select({
      taxEnabled: businessSettings.taxEnabled, taxRate: businessSettings.taxRate,
      pricesIncludeTax: businessSettings.pricesIncludeTax,
    }).from(businessSettings).where(eq(businessSettings.organizationId, intent.organizationId)).limit(1)
    const catalogue = await tx.select({
      id: product.id, name: product.name, sellingPrice: product.sellingPrice, active: product.isActive,
    }).from(product).where(and(eq(product.orgId, intent.organizationId), inArray(product.id, productIds)))
    const byId = new Map(catalogue.map((item) => [item.id, item]))
    const lines = checkout.items.map((line) => {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('Invalid M-Pesa basket quantity')
      const item = byId.get(line.productId)
      if (!item?.active) throw new Error('A paid basket product is unavailable')
      const unitPrice = Number(item.sellingPrice)
      return { ...line, productName: item.name, unitPrice, totalPrice: unitPrice * line.quantity, saleItemId: generateId() }
    })
    if (intent.customerId) {
      const [ownedCustomer] = await tx.select({ id: customer.id }).from(customer).where(and(
        eq(customer.id, intent.customerId), eq(customer.orgId, intent.organizationId),
      )).limit(1)
      if (!ownedCustomer) throw new Error('Checkout customer is not in this organization')
    }
    const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0)
    const rate = settings?.taxEnabled ? Number(settings.taxRate || 0) / 100 : 0
    const tax = rate ? (settings?.pricesIncludeTax ? subtotal - subtotal / (1 + rate) : subtotal * rate) : 0
    const gross = settings?.pricesIncludeTax ? subtotal : subtotal + tax
    if (checkout.discountAmount < 0 || checkout.discountAmount > gross) throw new Error('Invalid checkout discount')
    const rounded = calculateMpesaAmount(Number((gross - checkout.discountAmount).toFixed(2)))
    if (Math.abs(rounded.amount - Number(intent.amount)) > 0.001) throw new Error('Paid amount no longer matches the checkout')

    const saleId = generateId()
    const receiptNo = generateReceiptNo()
    const claimed = await tx.update(mpesaPaymentRequest).set({ saleId, updatedAt: new Date() }).where(and(
      eq(mpesaPaymentRequest.id, intent.id), eq(mpesaPaymentRequest.status, 'CONFIRMED'), isNull(mpesaPaymentRequest.saleId),
    )).returning({ id: mpesaPaymentRequest.id })
    if (claimed.length !== 1) throw new Error('M-Pesa payment has already been claimed')

    const costByProduct = new Map<string, { unitCost: number; totalCost: number }>()
    for (const line of lines) {
      await applyInventoryMovement(tx, { productId: line.productId, productName: line.productName, branchId: intent.branchId, quantity: -line.quantity, type: 'sale', referenceType: 'sale', referenceId: saleId, reason: receiptNo, userId: intent.userId, orgId: intent.organizationId })
      costByProduct.set(line.productId, await consumeInventoryCost(tx, { productId: line.productId, branchId: intent.branchId, orgId: intent.organizationId, quantity: line.quantity }))
    }

    await tx.insert(sale).values({
      id: saleId, receiptNo, customerId: intent.customerId, subtotal: String(subtotal), taxAmount: String(tax),
      discountAmount: String(checkout.discountAmount), roundingAmount: String(rounded.roundingAmount), total: String(rounded.amount),
      paymentMethod: 'mpesa', mpesaRef: intent.receiptNumber, ageVerified: checkout.ageVerified,
      ageVerifiedAt: checkout.ageVerified ? new Date() : null, ageVerifiedBy: checkout.ageVerified ? intent.userId : null,
      status: 'completed', idempotencyKey: intent.idempotencyKey, userId: intent.userId, orgId: intent.organizationId,
      branchId: intent.branchId, posSessionId: intent.posSessionId,
    })
    await tx.insert(saleItem).values(lines.map((line) => ({
      id: line.saleItemId, saleId, productId: line.productId, productName: line.productName, quantity: line.quantity,
      unitPrice: String(line.unitPrice), totalPrice: String(line.totalPrice), userId: intent.userId, orgId: intent.organizationId,
      unitCostAtSale: String(costByProduct.get(line.productId)?.unitCost ?? 0), totalCost: String(costByProduct.get(line.productId)?.totalCost ?? 0),
    })))
    await tx.insert(salePayment).values({ id: generateId(), saleId, method: 'mpesa', amount: String(rounded.amount),
      reference: intent.receiptNumber, status: 'completed', userId: intent.userId, orgId: intent.organizationId })
    await tx.update(mpesaIncomingPayment).set({ status: 'MATCHED', matchedRequestId: intent.id })
      .where(eq(mpesaIncomingPayment.transactionId, intent.receiptNumber))
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: intent.organizationId, userId: intent.userId,
      action: 'mpesa_sale_finalized', metadata: { saleId, receiptNo, mpesaReceipt: intent.receiptNumber, requestId: intent.id,
        branchId: intent.branchId, posSessionId: intent.posSessionId, total: rounded.amount } })
    return { saleId, alreadyFinalized: false }
  })
  return result
}
