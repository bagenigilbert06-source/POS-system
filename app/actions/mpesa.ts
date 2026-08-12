'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { businessSettings, mpesaPaymentRequest, posSession, product } from '@/lib/db/schema'
import { requireAnyPermission } from '@/lib/auth/authorization'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'
import { mpesaPaybillDetails, normalizeKenyanPhone, registerC2bUrls, requestStkPush } from '@/lib/mpesa/daraja'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { calculateMpesaAmount } from '@/lib/mpesa/amount'

const itemSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().positive() })
const initiateSchema = z.object({
  phone: z.string().min(9).max(30),
  items: z.array(itemSchema).min(1).max(250),
  discountAmount: z.number().min(0),
  idempotencyKey: z.string().min(8).max(100),
  ageVerified: z.boolean().optional(),
})
const paybillSchema = initiateSchema.omit({ phone: true })
let c2bUrlsReady = false

async function paymentAuthorization() {
  const pos = await getPosAuthorizationContext()
  const authorization = pos ?? await requireAnyPermission([PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE])
  if (!authorization.permissions.includes(PermissionEnum.POS_SELL) && !authorization.permissions.includes(PermissionEnum.SALE_CREATE)) throw new Error('POS sale permission denied')
  return authorization
}

export async function initiateMpesaPayment(input: z.input<typeof initiateSchema>) {
  const data = initiateSchema.parse(input)
  const authorization = await paymentAuthorization()
  const { organizationId: orgId, userId } = authorization
  const [activeShift] = await db.select({ id: posSession.id }).from(posSession)
    .where(and(eq(posSession.orgId, orgId), eq(posSession.openedBy, userId), eq(posSession.status, 'open'))).limit(1)
  if (!activeShift) throw new Error('Start your shift before requesting payment')
  const workspace = await WorkspaceService.getWorkspaceConfig(orgId, userId)
  if (workspace?.businessCategory === 'liquor_shop' && !data.ageVerified) throw new Error('Verify the customer age before requesting M-Pesa payment')

  const [settings] = await db.select({
    paymentMethods: businessSettings.paymentMethods, taxEnabled: businessSettings.taxEnabled,
    taxRate: businessSettings.taxRate, pricesIncludeTax: businessSettings.pricesIncludeTax,
  }).from(businessSettings).where(eq(businessSettings.organizationId, orgId)).limit(1)
  const methods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  if (!methods.includes('mpesa')) throw new Error('M-Pesa is not enabled for this workspace')

  const productIds = Array.from(new Set(data.items.map((item) => item.productId)))
  if (productIds.length !== data.items.length) throw new Error('Duplicate basket items are not allowed')
  const products = await db.select({ id: product.id, price: product.sellingPrice, active: product.isActive, stock: product.stock })
    .from(product).where(and(eq(product.orgId, orgId), inArray(product.id, productIds)))
  const byId = new Map(products.map((item) => [item.id, item]))
  let subtotal = 0
  for (const line of data.items) {
    const item = byId.get(line.productId)
    if (!item?.active || item.stock < line.quantity) throw new Error('A basket item is unavailable or has insufficient stock')
    subtotal += Number(item.price) * line.quantity
  }
  const rate = settings?.taxEnabled ? Number(settings.taxRate || 0) / 100 : 0
  const tax = rate ? (settings?.pricesIncludeTax ? subtotal - subtotal / (1 + rate) : subtotal * rate) : 0
  const gross = settings?.pricesIncludeTax ? subtotal : subtotal + tax
  if (data.discountAmount > gross) throw new Error('Discount exceeds the sale total')
  const { amount: exactTotal } = calculateMpesaAmount(gross - data.discountAmount)
  if (exactTotal < 1 || exactTotal > 150000) throw new Error('M-Pesa amount must be between KES 1 and KES 150,000')

  const phone = normalizeKenyanPhone(data.phone)
  const [existing] = await db.select().from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.organizationId, orgId), eq(mpesaPaymentRequest.idempotencyKey, data.idempotencyKey),
  )).limit(1)
  if (existing) return { id: existing.id, status: existing.status, amount: Number(existing.amount), message: existing.resultDescription, receiptNumber: existing.receiptNumber }

  const id = generateId()
  await db.insert(mpesaPaymentRequest).values({
    id, organizationId: orgId, userId, idempotencyKey: data.idempotencyKey, phone, amount: String(exactTotal),
    status: 'initiating', expiresAt: new Date(Date.now() + 3 * 60_000),
  })
  try {
    const response = await requestStkPush({ phone, amount: exactTotal, accountReference: `POS${id.replace(/-/g, '').slice(0, 9)}` })
    await db.update(mpesaPaymentRequest).set({
      merchantRequestId: response.MerchantRequestID, checkoutRequestId: response.CheckoutRequestID,
      status: 'pending', resultDescription: response.CustomerMessage, updatedAt: new Date(),
    }).where(eq(mpesaPaymentRequest.id, id))
    return { id, status: 'pending', amount: exactTotal, message: response.CustomerMessage, receiptNumber: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start M-Pesa payment'
    await db.update(mpesaPaymentRequest).set({ status: 'failed', resultDescription: message, updatedAt: new Date() }).where(eq(mpesaPaymentRequest.id, id))
    throw new Error(message)
  }
}

/** Creates a basket-specific PayBill reference and waits for a C2B confirmation. */
export async function initiateMpesaPaybillPayment(input: z.input<typeof paybillSchema>) {
  const data = paybillSchema.parse(input)
  const authorization = await paymentAuthorization()
  const { organizationId: orgId, userId } = authorization
  const [activeShift] = await db.select({ id: posSession.id }).from(posSession)
    .where(and(eq(posSession.orgId, orgId), eq(posSession.openedBy, userId), eq(posSession.status, 'open'))).limit(1)
  if (!activeShift) throw new Error('Start your shift before requesting payment')
  const workspace = await WorkspaceService.getWorkspaceConfig(orgId, userId)
  if (workspace?.businessCategory === 'liquor_shop' && !data.ageVerified) throw new Error('Verify the customer age before requesting M-Pesa payment')

  const [settings] = await db.select({
    paymentMethods: businessSettings.paymentMethods, taxEnabled: businessSettings.taxEnabled,
    taxRate: businessSettings.taxRate, pricesIncludeTax: businessSettings.pricesIncludeTax,
  }).from(businessSettings).where(eq(businessSettings.organizationId, orgId)).limit(1)
  const methods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  if (!methods.includes('mpesa')) throw new Error('M-Pesa is not enabled for this workspace')

  const productIds = Array.from(new Set(data.items.map((item) => item.productId)))
  if (productIds.length !== data.items.length) throw new Error('Duplicate basket items are not allowed')
  const products = await db.select({ id: product.id, price: product.sellingPrice, active: product.isActive, stock: product.stock })
    .from(product).where(and(eq(product.orgId, orgId), inArray(product.id, productIds)))
  const byId = new Map(products.map((item) => [item.id, item]))
  let subtotal = 0
  for (const line of data.items) {
    const item = byId.get(line.productId)
    if (!item?.active || item.stock < line.quantity) throw new Error('A basket item is unavailable or has insufficient stock')
    subtotal += Number(item.price) * line.quantity
  }
  const rate = settings?.taxEnabled ? Number(settings.taxRate || 0) / 100 : 0
  const tax = rate ? (settings?.pricesIncludeTax ? subtotal - subtotal / (1 + rate) : subtotal * rate) : 0
  const gross = settings?.pricesIncludeTax ? subtotal : subtotal + tax
  if (data.discountAmount > gross) throw new Error('Discount exceeds the sale total')
  const { amount: exactTotal } = calculateMpesaAmount(gross - data.discountAmount)
  if (exactTotal < 1 || exactTotal > 150000) throw new Error('M-Pesa amount must be between KES 1 and KES 150,000')

  const [existing] = await db.select().from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.organizationId, orgId), eq(mpesaPaymentRequest.idempotencyKey, data.idempotencyKey),
  )).limit(1)
  if (existing) return {
    id: existing.id, status: existing.status, amount: Number(existing.amount), message: existing.resultDescription,
    receiptNumber: existing.receiptNumber, accountReference: existing.accountReference, shortcode: mpesaPaybillDetails().shortcode,
  }

  if (!c2bUrlsReady) {
    await registerC2bUrls()
    c2bUrlsReady = true
  }
  const id = generateId()
  const accountReference = `PSB${id.replace(/-/g, '').slice(0, 9)}`.toUpperCase()
  const { shortcode } = mpesaPaybillDetails()
  await db.insert(mpesaPaymentRequest).values({
    id, organizationId: orgId, userId, idempotencyKey: data.idempotencyKey, paymentMode: 'paybill', accountReference,
    phone: 'awaiting-c2b', amount: String(exactTotal), status: 'pending', resultDescription: 'Waiting for PayBill payment',
    expiresAt: new Date(Date.now() + 10 * 60_000),
  })
  return { id, status: 'pending', amount: exactTotal, message: 'Waiting for PayBill payment', receiptNumber: null, accountReference, shortcode }
}

export async function getMpesaPaymentStatus(requestId: string) {
  const authorization = await paymentAuthorization()
  const [request] = await db.select({
    id: mpesaPaymentRequest.id, status: mpesaPaymentRequest.status, amount: mpesaPaymentRequest.amount,
    receiptNumber: mpesaPaymentRequest.receiptNumber, message: mpesaPaymentRequest.resultDescription,
    expiresAt: mpesaPaymentRequest.expiresAt,
  }).from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.id, requestId), eq(mpesaPaymentRequest.organizationId, authorization.organizationId),
    eq(mpesaPaymentRequest.userId, authorization.userId),
  )).limit(1)
  if (!request) throw new Error('M-Pesa payment request was not found')
  if ((request.status === 'pending' || request.status === 'initiating') && request.expiresAt < new Date()) {
    await db.update(mpesaPaymentRequest).set({ status: 'timeout', resultDescription: 'No M-Pesa confirmation was received in time', updatedAt: new Date() })
      .where(and(eq(mpesaPaymentRequest.id, request.id), eq(mpesaPaymentRequest.status, request.status)))
    return { ...request, status: 'timeout', message: 'No M-Pesa confirmation was received in time' }
  }
  return { ...request, amount: Number(request.amount) }
}
