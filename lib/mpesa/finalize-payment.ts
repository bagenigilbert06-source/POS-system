import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  ageVerification, auditEvent, businessSettings, category, customer, mpesaIncomingPayment, mpesaPaymentRequest,
  pharmacyPrescriptionItem, pharmacyProduct, pharmacySaleRecord, posSession, product, productPackage, restrictedItemAudit,
  sale, saleItem, saleItemLotAllocation, salePayment,
} from '@/lib/db/schema'
import { calculateMpesaAmount } from '@/lib/mpesa/amount'
import { generateId, generateReceiptNo } from '@/lib/utils'
import { applyInventoryMovement, consumeInventoryCost } from '@/lib/inventory/inventory-service'
import { enqueueEtimsInvoice } from '@/lib/etims/service'
import { applySaleRewards } from '@/lib/services/rewards-service'
import { preTaxRewardAmount } from '@/lib/rewards/rules'

export type MpesaCheckoutPayload = {
  items: Array<{ productId: string; quantity: number; packageId?: string }>
  discountAmount: number
  shippingAmount?: number
  roundoffEnabled?: boolean
  ageVerified: boolean
  ageVerificationStatus?: 'VERIFIED' | 'OVERRIDDEN'
  ageOverrideReason?: string
  pointsToRedeem?: number
  bonusToUse?: number
  pharmacy?: { prescriptionReference?: string; prescriberReference?: string; patientReference?: string; issuedAt?: string | Date; expiresAt?: string | Date; notes?: string }
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
    const [activeShift] = await tx.select({ id: posSession.id, terminalId: posSession.terminalId }).from(posSession).where(and(
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
      id: product.id, name: product.name, sellingPrice: product.sellingPrice, active: product.isActive, categoryId: product.categoryId, requiresAgeVerification: product.requiresAgeVerification,
    }).from(product).where(and(eq(product.orgId, intent.organizationId), inArray(product.id, productIds)))
    const byId = new Map(catalogue.map((item) => [item.id, item]))
    const categoryIds = Array.from(new Set(catalogue.map((item) => item.categoryId).filter((value): value is string => Boolean(value))))
    const restrictedCategories = categoryIds.length ? await tx.select({ id: category.id, requiresAgeVerification: category.requiresAgeVerification }).from(category).where(and(eq(category.orgId, intent.organizationId), inArray(category.id, categoryIds))) : []
    const categoryRestrictions = new Map(restrictedCategories.map((item) => [item.id, item.requiresAgeVerification]))
    const restrictedBasket = catalogue.some((item) => item.requiresAgeVerification === true || (item.requiresAgeVerification == null && item.categoryId && categoryRestrictions.get(item.categoryId) === true))
    if (restrictedBasket && !checkout.ageVerified) throw new Error('Age verification is required before finalizing this restricted M-Pesa sale')
    const medicineRows = await tx.select().from(pharmacyProduct).where(and(eq(pharmacyProduct.organizationId, intent.organizationId), inArray(pharmacyProduct.productId, productIds)))
    const packageIds = checkout.items.map((line) => line.packageId).filter((value): value is string => Boolean(value))
    const packages = packageIds.length ? await tx.select().from(productPackage).where(and(eq(productPackage.organizationId, intent.organizationId), inArray(productPackage.id, packageIds), eq(productPackage.isActive, true))) : []
    const packageById = new Map(packages.map((item) => [item.id, item]))
    const lines = checkout.items.map((line) => {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('Invalid M-Pesa basket quantity')
      const item = byId.get(line.productId)
      if (!item?.active) throw new Error('A paid basket product is unavailable')
      const selectedPackage = line.packageId ? packageById.get(line.packageId) : null
      if (line.packageId && (!selectedPackage || selectedPackage.productId !== line.productId)) throw new Error('A paid basket package is unavailable')
      const unitPrice = Number(selectedPackage?.sellingPrice ?? item.sellingPrice)
      return { ...line, productName: selectedPackage ? `${item.name} (${selectedPackage.name})` : item.name, packageName: selectedPackage?.name, baseUnitQuantity: selectedPackage?.baseUnitQuantity ?? 1, unitPrice, totalPrice: unitPrice * line.quantity, saleItemId: generateId() }
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
    const shippingAmount = Number(checkout.shippingAmount ?? 0)
    if (!Number.isFinite(shippingAmount) || shippingAmount < 0) throw new Error('Invalid checkout shipping')
    const saleId = generateId()
    const rewards = intent.customerId ? await applySaleRewards(tx, {
      organizationId: intent.organizationId, customerId: intent.customerId, branchId: intent.branchId,
      saleId, userId: intent.userId,
      lines: lines.map((line) => ({ productId: line.productId, categoryId: byId.get(line.productId)?.categoryId ?? null, amount: preTaxRewardAmount(line.totalPrice, { enabled: settings?.taxEnabled ?? false, ratePercent: Number(settings?.taxRate ?? 0), pricesIncludeTax: settings?.pricesIncludeTax ?? false }), discounted: checkout.discountAmount > 0 })),
      ordinaryDiscount: preTaxRewardAmount(checkout.discountAmount, { enabled: settings?.taxEnabled ?? false, ratePercent: Number(settings?.taxRate ?? 0), pricesIncludeTax: settings?.pricesIncludeTax ?? false }), pointsToRedeem: checkout.pointsToRedeem, bonusToUse: checkout.bonusToUse,
      paymentRequestId: intent.id,
    }) : null
    const unroundedTotal = Number((gross + shippingAmount - checkout.discountAmount - (rewards?.externalAmountReduction ?? 0)).toFixed(2))
    const rounded = checkout.roundoffEnabled === false
      ? { amount: unroundedTotal, roundingAmount: 0 }
      : calculateMpesaAmount(unroundedTotal)
    if (Math.abs(rounded.amount - Number(intent.amount)) > 0.001) throw new Error('Paid amount no longer matches the checkout')

    const receiptNo = generateReceiptNo()
    const claimed = await tx.update(mpesaPaymentRequest).set({ saleId, finalizedAt: new Date(), updatedAt: new Date() }).where(and(
      eq(mpesaPaymentRequest.id, intent.id), eq(mpesaPaymentRequest.status, 'CONFIRMED'), isNull(mpesaPaymentRequest.saleId),
    )).returning({ id: mpesaPaymentRequest.id })
    if (claimed.length !== 1) throw new Error('M-Pesa payment has already been claimed')

    const costByProduct = new Map<string, { unitCost: number; totalCost: number }>()
    const lotsBySaleItem = new Map<string, Array<{ lotId: string; lotNumber: string; expiresAt: Date | null; quantity: number }>>()
    for (const line of lines) {
      const inventoryQuantity = line.quantity * line.baseUnitQuantity
      const movement = await applyInventoryMovement(tx, { productId: line.productId, productName: line.productName, branchId: intent.branchId, quantity: -inventoryQuantity, type: 'sale', referenceType: 'sale', referenceId: saleId, reason: receiptNo, userId: intent.userId, orgId: intent.organizationId })
      if (movement.lotAllocations.length) lotsBySaleItem.set(line.saleItemId, movement.lotAllocations)
      costByProduct.set(line.productId, await consumeInventoryCost(tx, { productId: line.productId, branchId: intent.branchId, orgId: intent.organizationId, quantity: inventoryQuantity }))
    }

    await tx.insert(sale).values({
      id: saleId, receiptNo, customerId: intent.customerId, subtotal: String(subtotal), taxAmount: String(tax),
      discountAmount: String(checkout.discountAmount), shippingAmount: String(shippingAmount), roundingAmount: String(rounded.roundingAmount), total: String(rounded.amount),
      paymentMethod: 'mpesa', mpesaRef: intent.receiptNumber, ageVerified: checkout.ageVerified,
      ageVerifiedAt: checkout.ageVerified ? new Date() : null, ageVerifiedBy: checkout.ageVerified ? intent.userId : null,
      status: 'completed', idempotencyKey: intent.idempotencyKey, userId: intent.userId, orgId: intent.organizationId,
      branchId: intent.branchId, posSessionId: intent.posSessionId,
      loyaltyPointsEarned: rewards?.pointsEarned ?? 0, loyaltyPointsRedeemed: rewards?.pointsRedeemed ?? 0,
      loyaltyRedemptionValue: String(rewards?.loyaltyRedemptionValue ?? 0), bonusRedeemed: String(rewards?.bonusRedeemed ?? 0),
      rewardEligibleSpend: String(rewards?.loyaltyEligible ?? 0), rewardEarningRateSnapshot: rewards ? String(rewards.settings.spendPerPoint) : null,
      rewardPointValueSnapshot: rewards ? String(rewards.settings.pointValue) : null,
    })
    if (restrictedBasket) {
      const now = new Date()
      const status = checkout.ageVerificationStatus ?? 'VERIFIED'
      await tx.insert(ageVerification).values({ id: generateId(), organizationId: intent.organizationId, branchId: intent.branchId, terminalId: activeShift.terminalId, saleId, checkoutId: intent.idempotencyKey, cashierId: intent.userId, status, verifiedAt: status === 'VERIFIED' ? now : null, overrideReason: status === 'OVERRIDDEN' ? checkout.ageOverrideReason : null, overrideApprovedBy: status === 'OVERRIDDEN' ? intent.userId : null, overrideApprovedAt: status === 'OVERRIDDEN' ? now : null })
      await tx.insert(auditEvent).values({ id: generateId(), organizationId: intent.organizationId, userId: intent.userId, action: status === 'OVERRIDDEN' ? 'age_verification_overridden' : 'age_verified', metadata: { saleId, receiptNo, branchId: intent.branchId, terminalId: activeShift.terminalId, verificationStatus: status } })
    }
    await tx.insert(saleItem).values(lines.map((line) => ({
      id: line.saleItemId, saleId, productId: line.productId, productName: line.productName, quantity: line.quantity,
      packageId: line.packageId ?? null, packageName: line.packageName ?? null, baseUnitQuantity: line.baseUnitQuantity,
      unitPrice: String(line.unitPrice), totalPrice: String(line.totalPrice), userId: intent.userId, orgId: intent.organizationId,
      unitCostAtSale: String(costByProduct.get(line.productId)?.unitCost ?? 0), totalCost: String(costByProduct.get(line.productId)?.totalCost ?? 0),
      rewardEligibleAmount: String(rewards?.lineEligibility.get(line.productId) ?? 0),
    })))
    const allocatedLots = lines.flatMap((line) => (lotsBySaleItem.get(line.saleItemId) ?? []).map((allocation) => ({
      id: generateId(), organizationId: intent.organizationId, saleId, saleItemId: line.saleItemId, productId: line.productId,
      lotId: allocation.lotId, lotNumber: allocation.lotNumber, expiresAt: allocation.expiresAt, quantity: String(allocation.quantity),
    })))
    if (allocatedLots.length) await tx.insert(saleItemLotAllocation).values(allocatedLots)
    const prescriptionItems = medicineRows.filter((item) => item.prescriptionRequired)
    const restrictedItems = medicineRows.filter((item) => item.restrictedItem)
    if (prescriptionItems.length || restrictedItems.length) {
      const prescriptionRecordId = generateId()
      await tx.insert(pharmacySaleRecord).values({
        id: prescriptionRecordId, organizationId: intent.organizationId, branchId: intent.branchId, saleId,
        prescriptionReference: checkout.pharmacy?.prescriptionReference || null,
        prescriberReference: checkout.pharmacy?.prescriberReference || null,
        patientReference: checkout.pharmacy?.patientReference || null,
        issuedAt: checkout.pharmacy?.issuedAt ? new Date(checkout.pharmacy.issuedAt) : null,
        expiresAt: checkout.pharmacy?.expiresAt ? new Date(checkout.pharmacy.expiresAt) : null,
        notes: checkout.pharmacy?.notes || null,
        status: 'dispensed', verifiedBy: intent.userId, verifiedAt: new Date(), approvalReason: checkout.pharmacy?.notes || null,
        approvedBy: restrictedItems.length ? intent.userId : null, createdBy: intent.userId,
      })
      const prescriptionIds = new Set(prescriptionItems.map((item) => item.productId))
      const prescriptionLines = lines.filter((line) => prescriptionIds.has(line.productId)).map((line) => ({ id: generateId(), organizationId: intent.organizationId, prescriptionRecordId, saleItemId: line.saleItemId, productId: line.productId, prescribedQuantity: String(line.quantity * line.baseUnitQuantity), dispensedQuantity: String(line.quantity * line.baseUnitQuantity) }))
      if (prescriptionLines.length) await tx.insert(pharmacyPrescriptionItem).values(prescriptionLines)
      const restrictedIds = new Set(restrictedItems.map((item) => item.productId))
      const auditRows = lines.filter((line) => restrictedIds.has(line.productId)).flatMap((line) => {
        const allocations = lotsBySaleItem.get(line.saleItemId) ?? []
        return (allocations.length ? allocations : [{ lotId: null, quantity: line.quantity * line.baseUnitQuantity }]).map((allocation) => ({
          id: generateId(), organizationId: intent.organizationId, branchId: intent.branchId!, saleId, saleItemId: line.saleItemId,
          productId: line.productId, lotId: allocation.lotId, cashierId: intent.userId, approvedBy: intent.userId,
          quantity: String(allocation.quantity), customerReference: intent.customerId || null,
          reason: checkout.pharmacy?.notes || 'Restricted medicine sale',
        }))
      })
      if (auditRows.length) await tx.insert(restrictedItemAudit).values(auditRows)
    }
    await tx.insert(salePayment).values({ id: generateId(), saleId, method: 'mpesa', amount: String(rounded.amount),
      reference: intent.receiptNumber, status: 'completed', userId: intent.userId, orgId: intent.organizationId })
    await tx.update(mpesaIncomingPayment).set({ status: 'MATCHED', matchedRequestId: intent.id, matchedAt: new Date(), matchedBy: intent.userId })
      .where(eq(mpesaIncomingPayment.transactionId, intent.receiptNumber))
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: intent.organizationId, userId: intent.userId,
      action: 'mpesa_sale_finalized', metadata: { saleId, receiptNo, mpesaReceipt: intent.receiptNumber, requestId: intent.id,
        branchId: intent.branchId, posSessionId: intent.posSessionId, total: rounded.amount } })
    return { saleId, alreadyFinalized: false }
  })
  if (!result.alreadyFinalized) {
    try { await enqueueEtimsInvoice(result.saleId) }
    catch (error) { console.error('[etims] M-Pesa sale queued without immediate fiscal result', { saleId: result.saleId, error: error instanceof Error ? error.message : 'unknown' }) }
  }
  return result
}
