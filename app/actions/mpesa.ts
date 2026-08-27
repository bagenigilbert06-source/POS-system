'use server'

import { and, desc, eq, gte, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { branch, businessSettings, customer, mpesaBusinessAccount, mpesaIncomingPayment, mpesaPaymentRequest, pharmacyConfiguration, pharmacyProduct, posSession, product, productPackage, sale, saleItem } from '@/lib/db/schema'
import { requireAnyPermission } from '@/lib/auth/authorization'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'
import { mpesaPaybillDetails, normalizeKenyanPhone, registerC2bUrls, requestStkPush } from '@/lib/mpesa/daraja'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { calculateMpesaAmount } from '@/lib/mpesa/amount'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'
import { reserveRewardsForPayment } from '@/lib/services/rewards-service'
import { finalizeConfirmedMpesaPayment } from '@/lib/mpesa/finalize-payment'

const itemSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().positive(), packageId: z.string().min(1).optional() })
const pharmacyWorkflowSchema = z.object({
  prescriptionReference: z.string().trim().min(2).max(120).optional(),
  prescriberReference: z.string().trim().max(160).optional(),
  patientReference: z.string().trim().max(160).optional(),
  issuedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
}).optional()
const initiateSchema = z.object({
  phone: z.string().min(9).max(30),
  items: z.array(itemSchema).min(1).max(250),
  discountAmount: z.number().min(0),
  shippingAmount: z.number().finite().min(0).default(0),
  roundoffEnabled: z.boolean().default(true),
  idempotencyKey: z.string().min(8).max(100),
  ageVerified: z.boolean().optional(),
  customerId: z.string().min(1).optional(),
  pointsToRedeem: z.number().int().min(0).optional(),
  bonusToUse: z.number().finite().min(0).optional(),
  pharmacy: pharmacyWorkflowSchema,
})
const paybillSchema = initiateSchema.extend({
  phone: z.string().max(30).optional().default(''),
  manualMode: z.enum(['till', 'paybill']).optional(),
})
let c2bUrlsReady = false

async function paymentAuthorization() {
  const pos = await getPosAuthorizationContext()
  const authorization = pos ?? await requireAnyPermission([PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE])
  if (!authorization.permissions.includes(PermissionEnum.POS_SELL) && !authorization.permissions.includes(PermissionEnum.SALE_CREATE)) throw new Error('POS sale permission denied')
  const branchId = pos?.branchId ?? authorization.branchIds[0]
  const [activeBranch] = branchId
    ? await db.select({ id: branch.id }).from(branch).where(and(eq(branch.id, branchId), eq(branch.organizationId, authorization.organizationId))).limit(1)
    : await db.select({ id: branch.id }).from(branch).where(and(eq(branch.organizationId, authorization.organizationId), eq(branch.isMain, true))).limit(1)
  if (!activeBranch) throw new Error('No authorized branch is available for this POS')
  return { ...authorization, branchId: activeBranch.id, terminalId: pos?.terminalId ?? null }
}

async function manualAccountsForBranch(organizationId: string, branchId: string) {
  const configured = await db.select({ shortcode: mpesaBusinessAccount.shortcode, accountType: mpesaBusinessAccount.accountType })
    .from(mpesaBusinessAccount).where(and(
      eq(mpesaBusinessAccount.organizationId, organizationId), eq(mpesaBusinessAccount.branchId, branchId),
      eq(mpesaBusinessAccount.active, true), inArray(mpesaBusinessAccount.accountType, ['till', 'paybill']),
    ))
  if (configured.length) return configured.filter((item): item is { shortcode: string; accountType: 'till' | 'paybill' } => item.accountType === 'till' || item.accountType === 'paybill')
  const fallback = mpesaPaybillDetails()
  return [{ shortcode: fallback.shortcode, accountType: fallback.accountType }]
}

export async function getManualMpesaOptions() {
  const authorization = await paymentAuthorization()
  const [accounts, settings] = await Promise.all([
    manualAccountsForBranch(authorization.organizationId, authorization.branchId),
    db.select({ displayName: businessSettings.displayName, receiptBusinessName: businessSettings.receiptBusinessName })
      .from(businessSettings).where(eq(businessSettings.organizationId, authorization.organizationId)).limit(1),
  ])
  return { accounts, defaultMode: accounts[0]?.accountType ?? 'paybill', merchantName: settings[0]?.receiptBusinessName || settings[0]?.displayName || null }
}

export async function setManualMpesaPayerPhone(requestId: string, value: string) {
  const authorization = await paymentAuthorization()
  const phone = value.trim() ? normalizeKenyanPhone(value) : ''
  await db.update(mpesaPaymentRequest).set({ phone, updatedAt: new Date() }).where(and(
    eq(mpesaPaymentRequest.id, requestId), eq(mpesaPaymentRequest.organizationId, authorization.organizationId),
    eq(mpesaPaymentRequest.userId, authorization.userId), inArray(mpesaPaymentRequest.paymentMode, ['till', 'paybill']),
    eq(mpesaPaymentRequest.status, 'AWAITING_CONFIRMATION'),
  ))
  return { phone }
}

async function validatePharmacyPayment(authorization: Awaited<ReturnType<typeof paymentAuthorization>>, productIds: string[], workflow: z.input<typeof pharmacyWorkflowSchema>) {
  const workspace = await WorkspaceService.getWorkspaceConfig(authorization.organizationId, authorization.userId)
  if (!workspace || !isPharmacyBusiness(workspace.businessType, workspace.businessCategory)) return
  const [items, policies] = await Promise.all([
    db.select().from(pharmacyProduct).where(and(eq(pharmacyProduct.organizationId, authorization.organizationId), inArray(pharmacyProduct.productId, productIds))),
    db.select().from(pharmacyConfiguration).where(eq(pharmacyConfiguration.organizationId, authorization.organizationId)).limit(1),
  ])
  const policy = policies[0]
  if (items.some((item) => item.prescriptionRequired) && !authorization.permissions.includes(PermissionEnum.PRESCRIPTION_DISPENSE))
    throw new Error('This staff role is not allowed to dispense prescription medicines')
  if ((policy?.prescriptionWorkflowEnabled ?? true) && items.some((item) => item.prescriptionRequired) && !workflow?.prescriptionReference)
    throw new Error('Enter the prescription reference before requesting payment')
  if ((policy?.restrictedItemWorkflowEnabled ?? true) && items.some((item) => item.restrictedItem) && !authorization.permissions.includes(PermissionEnum.PHARMACY_RESTRICTED_APPROVE))
    throw new Error('A pharmacist or authorized manager must approve this restricted-item sale')
  if (items.some((item) => item.restrictedItem) && !workflow?.notes?.trim()) throw new Error('Enter the restricted-medicine approval reason')
}

export async function initiateMpesaPayment(input: z.input<typeof initiateSchema>) {
  const data = initiateSchema.parse(input)
  const authorization = await paymentAuthorization()
  const { organizationId: orgId, userId, branchId } = authorization
  const [activeShift] = await db.select({ id: posSession.id }).from(posSession)
    .where(and(eq(posSession.orgId, orgId), eq(posSession.openedBy, userId), authorization.terminalId ? eq(posSession.terminalId, authorization.terminalId) : undefined, eq(posSession.status, 'open'))).limit(1)
  if (!activeShift) throw new Error('Start your shift before requesting payment')
  const workspace = await WorkspaceService.getWorkspaceConfig(orgId, userId)
  if (workspace?.businessCategory === 'liquor_shop' && !data.ageVerified) throw new Error('Verify the customer age before requesting M-Pesa payment')
  if (data.discountAmount > 0 && !authorization.permissions.includes(PermissionEnum.POS_DISCOUNT)) throw new Error('A supervisor or manager must apply this discount')
  if ((data.pointsToRedeem || data.bonusToUse) && !authorization.permissions.includes(PermissionEnum.REWARDS_REDEEM)) throw new Error('Reward redemption permission denied')
  if (data.customerId) {
    const [ownedCustomer] = await db.select({ id: customer.id }).from(customer).where(and(eq(customer.id, data.customerId), eq(customer.orgId, orgId))).limit(1)
    if (!ownedCustomer) throw new Error('Customer is not available in this workspace')
  }

  const [settings] = await db.select({
    paymentMethods: businessSettings.paymentMethods, taxEnabled: businessSettings.taxEnabled,
    taxRate: businessSettings.taxRate, pricesIncludeTax: businessSettings.pricesIncludeTax,
  }).from(businessSettings).where(eq(businessSettings.organizationId, orgId)).limit(1)
  const methods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  if (!methods.includes('mpesa')) throw new Error('M-Pesa is not enabled for this workspace')

  const productIds = Array.from(new Set(data.items.map((item) => item.productId)))
  if (productIds.length !== data.items.length) throw new Error('Duplicate basket items are not allowed')
  await validatePharmacyPayment(authorization, productIds, data.pharmacy)
  const products = await db.select({ id: product.id, price: product.sellingPrice, active: product.isActive, stock: product.stock, categoryId: product.categoryId })
    .from(product).where(and(eq(product.orgId, orgId), inArray(product.id, productIds)))
  const byId = new Map(products.map((item) => [item.id, item]))
  const packageIds = data.items.map((item) => item.packageId).filter((value): value is string => Boolean(value))
  const packages = packageIds.length ? await db.select().from(productPackage).where(and(eq(productPackage.organizationId, orgId), inArray(productPackage.id, packageIds), eq(productPackage.isActive, true))) : []
  const packageById = new Map(packages.map((item) => [item.id, item]))
  let subtotal = 0
  for (const line of data.items) {
    const item = byId.get(line.productId)
    const selectedPackage = line.packageId ? packageById.get(line.packageId) : null
    if (line.packageId && (!selectedPackage || selectedPackage.productId !== line.productId)) throw new Error('A basket package is unavailable')
    const baseQuantity = line.quantity * (selectedPackage?.baseUnitQuantity ?? 1)
    if (!item?.active || item.stock < baseQuantity) throw new Error('A basket item is unavailable or has insufficient stock')
    subtotal += Number(selectedPackage?.sellingPrice ?? item.price) * line.quantity
  }
  const rate = settings?.taxEnabled ? Number(settings.taxRate || 0) / 100 : 0
  const tax = rate ? (settings?.pricesIncludeTax ? subtotal - subtotal / (1 + rate) : subtotal * rate) : 0
  const gross = settings?.pricesIncludeTax ? subtotal : subtotal + tax
  if (data.discountAmount > gross) throw new Error('Discount exceeds the sale total')
  const unroundedTotal = Number((gross + data.shippingAmount - data.discountAmount).toFixed(2))
  if (unroundedTotal < 1 || unroundedTotal > 150000) throw new Error('M-Pesa amount must be between KES 1 and KES 150,000')
  let exactTotal = data.roundoffEnabled ? calculateMpesaAmount(unroundedTotal).amount : unroundedTotal

  const phone = data.phone.trim() ? normalizeKenyanPhone(data.phone) : ''
  const [existing] = await db.select().from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.organizationId, orgId), eq(mpesaPaymentRequest.idempotencyKey, data.idempotencyKey),
  )).limit(1)
  if (existing) return { id: existing.id, status: existing.status, amount: Number(existing.amount), message: existing.resultDescription, receiptNumber: existing.receiptNumber }

  const id = generateId()
  await db.transaction(async (tx) => {
    const [lockedShift] = await tx.select({ id: posSession.id }).from(posSession).where(and(eq(posSession.id, activeShift.id), eq(posSession.orgId, orgId), eq(posSession.branchId, branchId), eq(posSession.status, 'open'))).limit(1).for('update')
    if (!lockedShift) throw new Error('This shift is no longer open')
    const expiresAt = new Date(Date.now() + 3 * 60_000)
    const reservation = data.customerId ? await reserveRewardsForPayment(tx, { organizationId: orgId, customerId: data.customerId, branchId, paymentRequestId: id, expiresAt, ordinaryDiscount: data.discountAmount, pointsToRedeem: data.pointsToRedeem, bonusToUse: data.bonusToUse, lines: data.items.map((line) => ({ productId: line.productId, categoryId: byId.get(line.productId)?.categoryId ?? null, amount: Number(packageById.get(line.packageId ?? '')?.sellingPrice ?? byId.get(line.productId)!.price) * line.quantity, discounted: data.discountAmount > 0 })) }) : { externalAmountReduction: 0 }
    exactTotal = data.roundoffEnabled ? calculateMpesaAmount(unroundedTotal - reservation.externalAmountReduction).amount : Number((unroundedTotal - reservation.externalAmountReduction).toFixed(2))
    if (exactTotal < 1) throw new Error('M-Pesa amount after rewards must be at least KES 1')
    await tx.insert(mpesaPaymentRequest).values({
      id, organizationId: orgId, userId, branchId, posSessionId: activeShift.id, customerId: data.customerId,
      checkoutPayload: { items: data.items, discountAmount: data.discountAmount, shippingAmount: data.shippingAmount, roundoffEnabled: data.roundoffEnabled, ageVerified: Boolean(data.ageVerified), pharmacy: data.pharmacy, pointsToRedeem: data.pointsToRedeem, bonusToUse: data.bonusToUse },
      idempotencyKey: data.idempotencyKey, phone, amount: String(exactTotal),
      status: 'SENDING_STK', expiresAt,
    })
  })
  try {
    const response = await requestStkPush({ phone, amount: exactTotal, accountReference: `POS${id.replace(/-/g, '').slice(0, 9)}` })
    await db.update(mpesaPaymentRequest).set({
      merchantRequestId: response.MerchantRequestID, checkoutRequestId: response.CheckoutRequestID,
      status: 'AWAITING_CUSTOMER', resultDescription: response.CustomerMessage, updatedAt: new Date(),
    }).where(eq(mpesaPaymentRequest.id, id))
    return { id, status: 'AWAITING_CUSTOMER', amount: exactTotal, message: response.CustomerMessage, receiptNumber: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start M-Pesa payment'
    await db.update(mpesaPaymentRequest).set({ status: 'FAILED', resultDescription: message, updatedAt: new Date() }).where(eq(mpesaPaymentRequest.id, id))
    throw new Error(message)
  }
}

/** Creates a basket-specific PayBill reference and waits for a C2B confirmation. */
export async function initiateMpesaPaybillPayment(input: z.input<typeof paybillSchema>) {
  const data = paybillSchema.parse(input)
  const phone = normalizeKenyanPhone(data.phone)
  const authorization = await paymentAuthorization()
  const { organizationId: orgId, userId, branchId } = authorization
  const [activeShift] = await db.select({ id: posSession.id }).from(posSession)
    .where(and(eq(posSession.orgId, orgId), eq(posSession.openedBy, userId), authorization.terminalId ? eq(posSession.terminalId, authorization.terminalId) : undefined, eq(posSession.status, 'open'))).limit(1)
  if (!activeShift) throw new Error('Start your shift before requesting payment')
  const workspace = await WorkspaceService.getWorkspaceConfig(orgId, userId)
  if (workspace?.businessCategory === 'liquor_shop' && !data.ageVerified) throw new Error('Verify the customer age before requesting M-Pesa payment')
  if (data.discountAmount > 0 && !authorization.permissions.includes(PermissionEnum.POS_DISCOUNT)) throw new Error('A supervisor or manager must apply this discount')
  if ((data.pointsToRedeem || data.bonusToUse) && !authorization.permissions.includes(PermissionEnum.REWARDS_REDEEM)) throw new Error('Reward redemption permission denied')
  if (data.customerId) {
    const [ownedCustomer] = await db.select({ id: customer.id }).from(customer).where(and(eq(customer.id, data.customerId), eq(customer.orgId, orgId))).limit(1)
    if (!ownedCustomer) throw new Error('Customer is not available in this workspace')
  }

  const [settings] = await db.select({
    paymentMethods: businessSettings.paymentMethods, taxEnabled: businessSettings.taxEnabled,
    taxRate: businessSettings.taxRate, pricesIncludeTax: businessSettings.pricesIncludeTax,
  }).from(businessSettings).where(eq(businessSettings.organizationId, orgId)).limit(1)
  const methods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  if (!methods.includes('mpesa')) throw new Error('M-Pesa is not enabled for this workspace')

  const productIds = Array.from(new Set(data.items.map((item) => item.productId)))
  if (productIds.length !== data.items.length) throw new Error('Duplicate basket items are not allowed')
  await validatePharmacyPayment(authorization, productIds, data.pharmacy)
  const products = await db.select({ id: product.id, price: product.sellingPrice, active: product.isActive, stock: product.stock, categoryId: product.categoryId })
    .from(product).where(and(eq(product.orgId, orgId), inArray(product.id, productIds)))
  const byId = new Map(products.map((item) => [item.id, item]))
  const packageIds = data.items.map((item) => item.packageId).filter((value): value is string => Boolean(value))
  const packages = packageIds.length ? await db.select().from(productPackage).where(and(eq(productPackage.organizationId, orgId), inArray(productPackage.id, packageIds), eq(productPackage.isActive, true))) : []
  const packageById = new Map(packages.map((item) => [item.id, item]))
  let subtotal = 0
  for (const line of data.items) {
    const item = byId.get(line.productId)
    const selectedPackage = line.packageId ? packageById.get(line.packageId) : null
    if (line.packageId && (!selectedPackage || selectedPackage.productId !== line.productId)) throw new Error('A basket package is unavailable')
    const baseQuantity = line.quantity * (selectedPackage?.baseUnitQuantity ?? 1)
    if (!item?.active || item.stock < baseQuantity) throw new Error('A basket item is unavailable or has insufficient stock')
    subtotal += Number(selectedPackage?.sellingPrice ?? item.price) * line.quantity
  }
  const rate = settings?.taxEnabled ? Number(settings.taxRate || 0) / 100 : 0
  const tax = rate ? (settings?.pricesIncludeTax ? subtotal - subtotal / (1 + rate) : subtotal * rate) : 0
  const gross = settings?.pricesIncludeTax ? subtotal : subtotal + tax
  if (data.discountAmount > gross) throw new Error('Discount exceeds the sale total')
  const unroundedTotal = Number((gross + data.shippingAmount - data.discountAmount).toFixed(2))
  if (unroundedTotal < 1 || unroundedTotal > 150000) throw new Error('M-Pesa amount must be between KES 1 and KES 150,000')
  let exactTotal = data.roundoffEnabled ? calculateMpesaAmount(unroundedTotal).amount : unroundedTotal
  const accounts = await manualAccountsForBranch(orgId, branchId)
  const selectedAccount = accounts.find((account) => account.accountType === data.manualMode) ?? accounts[0]
  if (!selectedAccount) throw new Error('No active Till or PayBill account is configured for this branch')

  const [existing] = await db.select().from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.organizationId, orgId), eq(mpesaPaymentRequest.idempotencyKey, data.idempotencyKey),
  )).limit(1)
  if (existing) return {
    id: existing.id, status: existing.status, amount: Number(existing.amount), message: existing.resultDescription,
    receiptNumber: existing.receiptNumber, accountReference: existing.accountReference,
    shortcode: selectedAccount.shortcode, accountType: existing.paymentMode as 'till' | 'paybill',
  }

  const environmentAccount = mpesaPaybillDetails()
  if (!c2bUrlsReady && selectedAccount.shortcode === environmentAccount.shortcode) {
    await registerC2bUrls()
    c2bUrlsReady = true
  }
  const id = generateId()
  const accountReference = `POS-${id.replace(/-/g, '').slice(0, 5)}`.toUpperCase()
  const { shortcode, accountType } = selectedAccount
  await db.insert(mpesaBusinessAccount).values({ id: generateId(), organizationId: orgId, branchId, shortcode, accountType })
    .onConflictDoUpdate({ target: mpesaBusinessAccount.shortcode, set: { organizationId: orgId, branchId, accountType, active: true, updatedAt: new Date() } })
  await db.transaction(async (tx) => {
    const [lockedShift] = await tx.select({ id: posSession.id }).from(posSession).where(and(eq(posSession.id, activeShift.id), eq(posSession.orgId, orgId), eq(posSession.branchId, branchId), eq(posSession.status, 'open'))).limit(1).for('update')
    if (!lockedShift) throw new Error('This shift is no longer open')
    const expiresAt = new Date(Date.now() + 10 * 60_000)
    const reservation = data.customerId ? await reserveRewardsForPayment(tx, { organizationId: orgId, customerId: data.customerId, branchId, paymentRequestId: id, expiresAt, ordinaryDiscount: data.discountAmount, pointsToRedeem: data.pointsToRedeem, bonusToUse: data.bonusToUse, lines: data.items.map((line) => ({ productId: line.productId, categoryId: byId.get(line.productId)?.categoryId ?? null, amount: Number(packageById.get(line.packageId ?? '')?.sellingPrice ?? byId.get(line.productId)!.price) * line.quantity, discounted: data.discountAmount > 0 })) }) : { externalAmountReduction: 0 }
    exactTotal = data.roundoffEnabled ? calculateMpesaAmount(unroundedTotal - reservation.externalAmountReduction).amount : Number((unroundedTotal - reservation.externalAmountReduction).toFixed(2))
    if (exactTotal < 1) throw new Error('M-Pesa amount after rewards must be at least KES 1')
    await tx.insert(mpesaPaymentRequest).values({
      id, organizationId: orgId, userId, branchId, posSessionId: activeShift.id, customerId: data.customerId,
      checkoutPayload: { items: data.items, discountAmount: data.discountAmount, shippingAmount: data.shippingAmount, roundoffEnabled: data.roundoffEnabled, ageVerified: Boolean(data.ageVerified), pharmacy: data.pharmacy, pointsToRedeem: data.pointsToRedeem, bonusToUse: data.bonusToUse },
      idempotencyKey: data.idempotencyKey, paymentMode: accountType, accountReference: accountType === 'paybill' ? accountReference : null,
      phone, amount: String(exactTotal), status: 'AWAITING_CONFIRMATION', resultDescription: `Waiting for ${accountType === 'till' ? 'Till' : 'PayBill'} payment`,
      expiresAt,
    })
  })
  return { id, status: 'AWAITING_CONFIRMATION', amount: exactTotal, message: `Waiting for ${accountType === 'till' ? 'Till' : 'PayBill'} payment`, receiptNumber: null, accountReference: accountType === 'paybill' ? accountReference : null, shortcode, accountType }
}

export async function getMpesaPaymentStatus(requestId: string) {
  const authorization = await paymentAuthorization()
  const [request] = await db.select({
    id: mpesaPaymentRequest.id, status: mpesaPaymentRequest.status, amount: mpesaPaymentRequest.amount,
    receiptNumber: mpesaPaymentRequest.receiptNumber, message: mpesaPaymentRequest.resultDescription,
    expiresAt: mpesaPaymentRequest.expiresAt,
    saleId: mpesaPaymentRequest.saleId,
  }).from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.id, requestId), eq(mpesaPaymentRequest.organizationId, authorization.organizationId),
    eq(mpesaPaymentRequest.userId, authorization.userId),
  )).limit(1)
  if (!request) throw new Error('M-Pesa payment request was not found')
  if (['SENDING_STK', 'AWAITING_CUSTOMER', 'AWAITING_CONFIRMATION'].includes(request.status) && request.expiresAt < new Date()) {
    await db.update(mpesaPaymentRequest).set({ status: 'EXPIRED', resultDescription: 'No M-Pesa confirmation was received in time', updatedAt: new Date() })
      .where(and(eq(mpesaPaymentRequest.id, request.id), eq(mpesaPaymentRequest.status, request.status)))
    return { ...request, status: 'EXPIRED', message: 'No M-Pesa confirmation was received in time' }
  }
  return { ...request, amount: Number(request.amount) }
}

export async function findManualMpesaPayment(requestId: string) {
  const authorization = await paymentAuthorization()
  const [intent] = await db.select().from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.id, requestId), eq(mpesaPaymentRequest.organizationId, authorization.organizationId),
    eq(mpesaPaymentRequest.userId, authorization.userId), inArray(mpesaPaymentRequest.paymentMode, ['till', 'paybill']),
  )).limit(1)
  if (!intent) throw new Error('Manual M-Pesa payment request was not found')
  if (intent.saleId) return { status: 'confirmed' as const, receiptNumber: intent.receiptNumber, amount: Number(intent.amount) }
  const [account] = await db.select().from(mpesaBusinessAccount).where(and(
    eq(mpesaBusinessAccount.organizationId, intent.organizationId), eq(mpesaBusinessAccount.branchId, intent.branchId!),
    eq(mpesaBusinessAccount.accountType, intent.paymentMode), eq(mpesaBusinessAccount.active, true),
  )).limit(1)
  if (!account) throw new Error('The branch M-Pesa account is no longer active')
  const candidates = await db.select().from(mpesaIncomingPayment).where(and(
    eq(mpesaIncomingPayment.organizationId, intent.organizationId), eq(mpesaIncomingPayment.branchId, intent.branchId!),
    eq(mpesaIncomingPayment.shortcode, account.shortcode), intent.phone ? eq(mpesaIncomingPayment.phone, intent.phone) : undefined,
    intent.paymentMode === 'paybill' ? eq(mpesaIncomingPayment.accountReference, intent.accountReference!) : undefined,
    gte(mpesaIncomingPayment.createdAt, intent.createdAt), isNull(mpesaIncomingPayment.matchedRequestId),
  )).orderBy(desc(mpesaIncomingPayment.createdAt)).limit(5)
  const exact = candidates.filter((candidate) => Number(candidate.amount) === Number(intent.amount))
  if (exact.length > 1) return { status: 'ambiguous' as const, count: exact.length }
  if (!exact.length) {
    const nearest = candidates[0]
    return nearest
      ? { status: 'amount_mismatch' as const, expected: Number(intent.amount), received: Number(nearest.amount), receiptNumber: nearest.transactionId }
      : { status: 'not_found' as const }
  }
  const payment = exact[0]
  await db.transaction(async (tx) => {
    const [claimedReceipt] = await tx.update(mpesaIncomingPayment).set({ matchedRequestId: intent.id, matchedAt: new Date(), matchedBy: authorization.userId, status: 'MATCHED_PENDING_FINALIZATION' })
      .where(and(eq(mpesaIncomingPayment.id, payment.id), isNull(mpesaIncomingPayment.matchedRequestId))).returning({ id: mpesaIncomingPayment.id })
    if (!claimedReceipt) throw new Error('This M-Pesa payment has already been used.')
    const [claimedIntent] = await tx.update(mpesaPaymentRequest).set({
      receiptNumber: payment.transactionId, resultCode: '0', resultDescription: 'Payment found and verified',
      status: 'CONFIRMED', callbackPayload: payment.payload, completedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(mpesaPaymentRequest.id, intent.id), eq(mpesaPaymentRequest.status, 'AWAITING_CONFIRMATION'))).returning({ id: mpesaPaymentRequest.id })
    if (!claimedIntent) throw new Error('This payment request is no longer available')
  })
  await finalizeConfirmedMpesaPayment(intent.id)
  return { status: 'confirmed' as const, receiptNumber: payment.transactionId, amount: Number(payment.amount) }
}

/** Returns receipt data only after the callback-owned finalizer has committed the sale. */
export async function getFinalizedMpesaSale(requestId: string) {
  const authorization = await paymentAuthorization()
  const [request] = await db.select({ saleId: mpesaPaymentRequest.saleId, paymentMode: mpesaPaymentRequest.paymentMode, phone: mpesaPaymentRequest.phone, accountReference: mpesaPaymentRequest.accountReference }).from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.id, requestId),
    eq(mpesaPaymentRequest.organizationId, authorization.organizationId),
    eq(mpesaPaymentRequest.userId, authorization.userId),
  )).limit(1)
  if (!request?.saleId) throw new Error('M-Pesa sale is still being finalized')
  const [completedSale] = await db.select().from(sale).where(and(
    eq(sale.id, request.saleId), eq(sale.orgId, authorization.organizationId),
  )).limit(1)
  if (!completedSale || completedSale.paymentMethod !== 'mpesa') throw new Error('Finalized M-Pesa sale was not found')
  const items = await db.select({ saleItemId: saleItem.id, productId: saleItem.productId }).from(saleItem).where(and(
    eq(saleItem.saleId, completedSale.id), eq(saleItem.orgId, authorization.organizationId),
  ))
  return {
    saleId: completedSale.id,
    receiptNo: completedSale.receiptNo,
    tax: Number(completedSale.taxAmount),
    rounding: Number(completedSale.roundingAmount),
    total: Number(completedSale.total),
    idempotencyKey: completedSale.idempotencyKey,
    items,
    isDuplicate: true,
    mpesaDetails: { mode: request.paymentMode, phone: request.phone, accountReference: request.accountReference },
    etims: { status: 'PENDING' as const, message: 'Sale completed. eTIMS submission is processed independently.' },
  }
}
