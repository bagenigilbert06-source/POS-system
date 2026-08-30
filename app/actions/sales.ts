'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ageVerification, branch, cardPaymentAttempt, cardTerminal, sale, saleItem, saleItemLotAllocation, salePayment, product, productPackage, pharmacyConfiguration, pharmacyPrescriptionItem, pharmacyProduct, pharmacySaleRecord, restrictedItemAudit, businessSettings, auditEvent, posSession, customer, customerCreditLimit, creditSale, invoice, invoiceItem, invoiceNumberSequence, organization, salesReturn, salesReturnItem, expense, user, category, etimsConfiguration, etimsSubmission, offlineSaleSync } from '@/lib/db/schema'
import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, or, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generateId, generateReceiptNo } from '@/lib/utils'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { z } from 'zod'
import { requireAnyPermission, requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum, RoleEnum } from '@/lib/types/permissions'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { invalidateProductReadCache } from '@/lib/cache/redis-cache'
import { calculateMpesaAmount } from '@/lib/mpesa/amount'
import { applyInventoryMovement, consumeInventoryCost } from '@/lib/inventory/inventory-service'
import { enqueueEtimsInvoice } from '@/lib/etims/service'
import { createHash } from 'node:crypto'
import { classifyOfflineSyncError, offlineAmountConflicts } from '@/lib/pos/offline-policy'
import { baseUnitsForSale } from '@/lib/pos/product-packaging'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'
import { applySaleRewards, reverseRewardsForVoid } from '@/lib/services/rewards-service'
import { money, preTaxRewardAmount } from '@/lib/rewards/rules'
import { configuredTax, money as financeMoney, paymentStatus } from '@/lib/finance/money'
import { getFiscalReadiness } from '@/lib/etims/policy'
import Decimal from 'decimal.js'
import { maskAgeIdReference } from '@/lib/pos/age-verification'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

async function getOrgId(userId: string, moduleId = 'sales') {
  const organization = await OrganizationService.getPrimaryOrganization(userId)
  if (!organization) throw new Error('No organization available')
  const config = await WorkspaceService.getWorkspaceConfig(organization.id, userId)
  if (!config?.enabledModules.includes(moduleId)) throw new Error(`${moduleId} is not enabled for this workspace`)
  return organization.id
}

async function syncLinkedInvoiceFiscalStatus(saleId: string, orgId: string) {
  const [fiscal] = await db.select({ status: etimsSubmission.status, invoiceNumber: etimsSubmission.invoiceNumber, controlNumber: etimsSubmission.controlNumber }).from(etimsSubmission).where(and(eq(etimsSubmission.saleId, saleId), eq(etimsSubmission.organizationId, orgId))).limit(1)
  if (!fiscal) return
  await db.update(invoice).set({ fiscalStatus: fiscal.status.toLowerCase(), fiscalReference: fiscal.invoiceNumber || fiscal.controlNumber || null, updatedAt: new Date() }).where(and(eq(invoice.saleId, saleId), eq(invoice.orgId, orgId)))
}

export type CartItem = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  packageId?: string
  packageName?: string
  baseUnitQuantity?: number
}

const offlineMetadataSchema = z.object({
  queueId: z.string().uuid(),
  provisionalReceiptNo: z.string().trim().regex(/^OFF-[A-Z0-9-]{8,40}$/),
  createdAt: z.coerce.date(),
  sessionId: z.string().min(1).max(120),
})

const pharmacyWorkflowSchema = z.object({
  prescriptionReference: z.string().trim().min(2).max(120).optional(),
  prescriberReference: z.string().trim().max(160).optional(),
  patientReference: z.string().trim().max(160).optional(),
  issuedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  approvalReason: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
}).optional()

const ageVerificationEvidenceSchema = z.object({
  status: z.enum(['VERIFIED', 'OVERRIDDEN']),
  idType: z.enum(['national_id', 'passport', 'driving_licence', 'other']).optional(),
  idReference: z.string().trim().max(80).optional(),
  overrideReason: z.string().trim().min(3).max(500).optional(),
})

export type CreateSaleInput = {
  customerId?: string
  items: CartItem[]
  subtotal: number
  discountAmount: number
  shippingAmount?: number
  roundoffEnabled?: boolean
  total: number
  paymentMethod: string
  mpesaRef?: string
  paymentReference?: string
  cardPaymentAttemptId?: string
  mpesaPaymentRequestId?: string
  amountReceived?: number
  creditDueDate?: Date
  pointsToRedeem?: number
  bonusToUse?: number
  paymentReceiver?: string
  paymentNote?: string
  saleNote?: string
  staffNote?: string
  idempotencyKey?: string
  ageVerified?: boolean
  ageVerification?: z.input<typeof ageVerificationEvidenceSchema>
  pharmacy?: z.input<typeof pharmacyWorkflowSchema>
  offline?: z.input<typeof offlineMetadataSchema>
}

const cancelAgeVerificationSchema = z.object({ checkoutId: z.string().uuid() })

/** Records a compliance check that the cashier dismissed; it never authorizes payment. */
export async function cancelAgeVerification(input: z.input<typeof cancelAgeVerificationSchema>) {
  const { checkoutId } = cancelAgeVerificationSchema.parse(input)
  const pos = await getPosAuthorizationContext()
  const authorization = pos ?? await requireAnyPermission([PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE])
  const userId = pos?.userId ?? authorization.userId
  const organizationId = pos?.organizationId ?? authorization.organizationId
  const [shift] = await db.select({ id: posSession.id, branchId: posSession.branchId, terminalId: posSession.terminalId }).from(posSession).where(and(eq(posSession.orgId, organizationId), eq(posSession.openedBy, userId), eq(posSession.status, 'open'), pos?.terminalId ? eq(posSession.terminalId, pos.terminalId) : undefined)).limit(1)
  if (!shift?.branchId) throw new Error('Start a branch-assigned shift before recording an age check')
  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.insert(ageVerification).values({ id: generateId(), organizationId, branchId: shift.branchId, terminalId: shift.terminalId, saleId: null, checkoutId, cashierId: userId, status: 'CANCELLED', cancelledAt: now })
    await tx.insert(auditEvent).values({ id: generateId(), organizationId, userId, action: 'age_verification_cancelled', metadata: { checkoutId, branchId: shift.branchId, terminalId: shift.terminalId } })
  })
  return { status: 'CANCELLED' as const }
}

const manualSaleSchema = z.object({
  description: z.string().trim().min(2).max(120),
  amount: z.number().positive().max(999999999),
  paymentMethod: z.string().trim().min(1).max(40),
})

const voidSaleSchema = z.object({ saleId: z.string().min(1), reason: z.string().trim().min(3).max(300) })

/** Cancels a completed sale without deleting history and restores its inventory once. */
export async function voidSale(input: z.input<typeof voidSaleSchema>) {
  const data = voidSaleSchema.parse(input)
  const authorization = await requirePermission(PermissionEnum.POS_VOID)
  const { userId, organizationId: orgId } = authorization
  await db.transaction(async (tx) => {
    const [record] = await tx.select().from(sale).where(and(eq(sale.id, data.saleId), eq(sale.orgId, orgId))).limit(1)
    if (!record) throw new Error('Sale not found')
    const [fiscal] = await tx.select({ id: etimsSubmission.id, status: etimsSubmission.status }).from(etimsSubmission)
      .where(eq(etimsSubmission.saleId, record.id)).limit(1)
    if (fiscal && ['ACCEPTED', 'CREDITED'].includes(fiscal.status)) throw new Error('This sale has an accepted eTIMS invoice. Process a refund/credit note instead of voiding it.')
    if (fiscal && ['SUBMITTING', 'RETRYING'].includes(fiscal.status)) throw new Error('This sale has an eTIMS submission in progress. Reconcile it before voiding the sale.')
    if (!record.branchId) throw new Error('The sale has no inventory location')
    if (!authorization.isOrganizationWide && !authorization.branchIds.includes(record.branchId)) throw new Error('This sale is outside your assigned branches')
    if (!['completed', 'pending'].includes(record.status)) throw new Error('Only completed or pending sales can be voided')
    const [existingReturn] = await tx.select({ id: salesReturn.id }).from(salesReturn).where(and(eq(salesReturn.saleId, record.id), eq(salesReturn.orgId, orgId), eq(salesReturn.status, 'completed'))).limit(1)
    if (existingReturn) throw new Error('A refunded sale cannot be voided')
    const lines = await tx.select().from(saleItem).where(and(eq(saleItem.saleId, record.id), eq(saleItem.orgId, orgId)))
    if (record.status === 'completed') for (const line of lines) await applyInventoryMovement(tx, { productId: line.productId, productName: line.productName, branchId: record.branchId, quantity: line.quantity * line.baseUnitQuantity, type: 'sale_void', referenceType: 'sale_void', referenceId: record.id, reason: data.reason, userId, orgId, unitCost: Number(line.unitCostAtSale) })
    if (record.status === 'completed') await reverseRewardsForVoid(tx, { organizationId: orgId, saleId: record.id, branchId: record.branchId, userId })
    await tx.update(sale).set({ status: 'cancelled' }).where(and(eq(sale.id, record.id), eq(sale.orgId, orgId)))
    if (fiscal && ['PENDING', 'FAILED'].includes(fiscal.status)) await tx.update(etimsSubmission).set({ status: 'CANCELLED', nextRetryAt: null, errorMessage: 'Sale voided before fiscal acceptance', updatedAt: new Date() }).where(eq(etimsSubmission.id, fiscal.id))
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'sale_voided', metadata: { saleId: record.id, receiptNo: record.receiptNo, reason: data.reason, previousStatus: record.status, etimsStatus: fiscal?.status ?? null } })
  })
  await invalidateProductReadCache(orgId)
  revalidatePath('/dashboard/sales'); revalidatePath('/dashboard/pos'); revalidatePath('/dashboard/inventory'); revalidatePath('/dashboard/operations')
  return { success: true }
}

export async function createManualSale(input: z.input<typeof manualSaleSchema>) {
  const data = manualSaleSchema.parse(input)
  const userId = await getUserId()
  const authorization = await requirePermission(PermissionEnum.SALE_CREATE)
  const orgId = await getOrgId(userId, 'sales')
  const [settings] = await db.select({
    paymentMethods: businessSettings.paymentMethods,
    taxEnabled: businessSettings.taxEnabled,
    taxRate: businessSettings.taxRate,
    pricesIncludeTax: businessSettings.pricesIncludeTax,
  }).from(businessSettings)
    .where(eq(businessSettings.organizationId, orgId)).limit(1)
  const allowedMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  if (!allowedMethods.includes(data.paymentMethod)) throw new Error('Choose a payment method enabled for this workspace')
  const taxAmount = configuredTax(data.amount, { enabled: settings?.taxEnabled ?? false, ratePercent: Number(settings?.taxRate ?? 0), pricesIncludeTax: settings?.pricesIncludeTax ?? false }).toNumber()
  const total = settings?.pricesIncludeTax ? data.amount : data.amount + taxAmount
  const saleId = generateId()
  const receiptNo = generateReceiptNo()
  let branchId = authorization.isOrganizationWide ? null : authorization.branchIds[0]
  if (authorization.isOrganizationWide) {
    const [mainBranch] = await db.select({ id: branch.id }).from(branch).where(and(eq(branch.organizationId, orgId), eq(branch.isMain, true))).limit(1)
    branchId = mainBranch?.id ?? null
  }
  if (!branchId) throw new Error('No assigned branch is available')
  await db.transaction(async (tx) => {
    await tx.insert(sale).values({
      id: saleId, receiptNo, subtotal: String(data.amount), taxAmount: String(taxAmount), discountAmount: '0', total: String(total),
      paymentMethod: data.paymentMethod, status: 'completed', userId, orgId, branchId,
    })
    await tx.insert(saleItem).values({
      id: generateId(), saleId, productId: `manual-${saleId}`, productName: data.description, quantity: 1,
      unitPrice: String(data.amount), totalPrice: String(total), userId, orgId,
    })
  })
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sales')
  let etims: Awaited<ReturnType<typeof enqueueEtimsInvoice>> | { status: 'PENDING'; message: string }
  try { etims = await enqueueEtimsInvoice(saleId) }
  catch { etims = { status: 'PENDING', message: 'Sale completed. eTIMS submission will require reconciliation.' } }
  return { saleId, receiptNo, etims }
}

export async function createSale(data: CreateSaleInput) {
  if (!Array.isArray(data.items) || data.items.length === 0 || data.items.length > 250) throw new Error('Add between 1 and 250 products')
  if (!Number.isFinite(data.discountAmount) || data.discountAmount < 0) throw new Error('Invalid discount amount')
  if (!data.idempotencyKey || data.idempotencyKey.length > 100) throw new Error('A valid transaction ID is required')
  const posAuthorization = await getPosAuthorizationContext()
  const userId = posAuthorization?.userId ?? await getUserId()
  const saleAuthorization = posAuthorization ?? await requireAnyPermission([PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE])
  if (!saleAuthorization.permissions.includes(PermissionEnum.POS_SELL) && !saleAuthorization.permissions.includes(PermissionEnum.SALE_CREATE)) throw new Error('POS sale permission denied')
  const orgId = posAuthorization?.organizationId ?? await getOrgId(userId, 'pos')
  const idempotencyKey = data.idempotencyKey
  const offline = data.offline ? offlineMetadataSchema.parse(data.offline) : null
  const pharmacyWorkflow = pharmacyWorkflowSchema.parse(data.pharmacy)
  if (offline && data.paymentMethod !== 'cash') throw new Error('Offline synchronization supports cash sales only')
  if (offline && offline.queueId !== idempotencyKey) throw new Error('Offline queue ID must match the sale transaction ID')
  
  // Check for duplicate submission (idempotency)
  const [existingSale] = await db.select().from(sale)
    .where(and(
      eq(sale.orgId, orgId),
      eq(sale.idempotencyKey, idempotencyKey)
    )).limit(1)
  
  if (existingSale) {
    const existingItems = await db.select({ saleItemId: saleItem.id, productId: saleItem.productId })
      .from(saleItem).where(and(eq(saleItem.saleId, existingSale.id), eq(saleItem.orgId, orgId)))
    let etims: Awaited<ReturnType<typeof enqueueEtimsInvoice>> | { status: 'PENDING'; message: string }
    try { etims = await enqueueEtimsInvoice(existingSale.id) }
    catch { etims = { status: 'PENDING', message: 'Sale completed. eTIMS submission will require reconciliation.' } }
    await syncLinkedInvoiceFiscalStatus(existingSale.id, orgId)
    return { 
      saleId: existingSale.id, 
      receiptNo: existingSale.receiptNo, 
      tax: parseFloat(existingSale.taxAmount),
      rounding: parseFloat(existingSale.roundingAmount),
      total: parseFloat(existingSale.total),
      idempotencyKey,
      items: existingItems,
      isDuplicate: true,
      etims,
    }
  }

  const [activeShift] = await db.select({ id: posSession.id, branchId: posSession.branchId, terminalId: posSession.terminalId, openedAt: posSession.openedAt }).from(posSession).where(and(eq(posSession.orgId, orgId), eq(posSession.openedBy, userId), offline ? eq(posSession.id, offline.sessionId) : undefined, posAuthorization?.terminalId ? eq(posSession.terminalId, posAuthorization.terminalId) : undefined, eq(posSession.status, 'open'))).limit(1)
  if (!activeShift) throw new Error(offline ? 'The original shift is closed or unavailable. This offline sale requires manager reconciliation.' : 'Start your shift before completing a sale')
  if (offline && (offline.createdAt.getTime() < activeShift.openedAt.getTime() - 60_000 || offline.createdAt.getTime() > Date.now() + 5 * 60_000)) throw new Error('Offline sale time falls outside the original shift')
  let saleBranchId = offline ? activeShift.branchId : posAuthorization?.branchId ?? saleAuthorization.branchIds[0]
  if (!saleBranchId) {
    const [mainBranch] = await db.select({ id: branch.id }).from(branch).where(and(eq(branch.organizationId, orgId), eq(branch.isMain, true))).limit(1)
    saleBranchId = mainBranch?.id
  }
  if (!saleBranchId) throw new Error('No authorized branch is available for this sale')
  const [fiscalConfiguration] = await db.select({ environment: etimsConfiguration.environment, enabled: etimsConfiguration.enabled, invoiceSubmissionEnabled: etimsConfiguration.invoiceSubmissionEnabled, connectionStatus: etimsConfiguration.connectionStatus }).from(etimsConfiguration).where(and(eq(etimsConfiguration.organizationId, orgId), eq(etimsConfiguration.branchId, saleBranchId))).limit(1)
  const fiscalReadiness = getFiscalReadiness(fiscalConfiguration)
  if (fiscalReadiness !== 'READY' && fiscalReadiness !== 'DEVELOPMENT_SIMULATOR' && fiscalConfiguration?.environment === 'production') throw new Error('eTIMS setup is incomplete for this branch. Complete fiscal setup before processing live sales.')
  const workspace = await WorkspaceService.getWorkspaceConfig(orgId, userId)
  const liquorWorkspace = workspace?.businessCategory === 'liquor_shop'
  const verificationEvidence = data.ageVerification ? ageVerificationEvidenceSchema.parse(data.ageVerification) : null
  const pharmacyWorkspace = Boolean(workspace && isPharmacyBusiness(workspace.businessType, workspace.businessCategory))
  if (verificationEvidence?.status === 'OVERRIDDEN') {
    if (!saleAuthorization.permissions.includes(PermissionEnum.AGE_VERIFICATION_OVERRIDE)) throw new Error('Age verification override permission denied')
    if (!verificationEvidence.overrideReason) throw new Error('Enter a reason for the age verification override')
  }
  
  if (data.discountAmount > 0 && !saleAuthorization.permissions.includes(PermissionEnum.POS_DISCOUNT)) throw new Error('A supervisor or manager must apply this discount')
  const productIds = Array.from(new Set(data.items.map((line) => line.productId)))
  if (productIds.length !== data.items.length) throw new Error('Duplicate products must be combined into one basket line')
  const catalogue = await db.select({ id: product.id, name: product.name, sellingPrice: product.sellingPrice, categoryId: product.categoryId, active: product.isActive, requiresAgeVerification: product.requiresAgeVerification })
    .from(product).where(and(eq(product.orgId, orgId), inArray(product.id, productIds)))
  const catalogueById = new Map(catalogue.map((item) => [item.id, item]))
  const categoryIds = Array.from(new Set(catalogue.map((item) => item.categoryId).filter((value): value is string => Boolean(value))))
  const categoryRestrictions = categoryIds.length ? await db.select({ id: category.id, requiresAgeVerification: category.requiresAgeVerification }).from(category).where(and(eq(category.orgId, orgId), inArray(category.id, categoryIds))) : []
  const categoryRestrictionById = new Map(categoryRestrictions.map((item) => [item.id, item.requiresAgeVerification]))
  const requiresAgeVerification = catalogue.some((item) => item.requiresAgeVerification ?? (item.categoryId ? categoryRestrictionById.get(item.categoryId) : null) ?? liquorWorkspace)
  if (requiresAgeVerification && !verificationEvidence) throw new Error('Age verification is required before completing this restricted sale')
  const medicineRows = pharmacyWorkspace ? await db.select().from(pharmacyProduct).where(and(eq(pharmacyProduct.organizationId, orgId), inArray(pharmacyProduct.productId, productIds))) : []
  const [pharmacyPolicy] = pharmacyWorkspace ? await db.select().from(pharmacyConfiguration).where(eq(pharmacyConfiguration.organizationId, orgId)).limit(1) : []
  const prescriptionItems = medicineRows.filter((item) => item.prescriptionRequired)
  const restrictedItems = medicineRows.filter((item) => item.restrictedItem)
  if (prescriptionItems.length && !saleAuthorization.permissions.includes(PermissionEnum.PRESCRIPTION_DISPENSE))
    throw new Error('This staff role is not allowed to dispense prescription medicines')
  if ((pharmacyPolicy?.prescriptionWorkflowEnabled ?? true) && prescriptionItems.length && !pharmacyWorkflow?.prescriptionReference)
    throw new Error('Enter the prescription reference for this sale')
  if ((pharmacyPolicy?.restrictedItemWorkflowEnabled ?? true) && restrictedItems.length && !saleAuthorization.permissions.includes(PermissionEnum.PHARMACY_RESTRICTED_APPROVE))
    throw new Error('A pharmacist or authorized manager must approve this restricted-item sale')
  if (restrictedItems.length && !(pharmacyWorkflow?.approvalReason || pharmacyWorkflow?.notes)?.trim()) throw new Error('Enter the restricted-medicine approval reason')
  if (pharmacyWorkflow?.expiresAt && pharmacyWorkflow.expiresAt <= new Date()) throw new Error('The prescription has expired')
  if (offline && (prescriptionItems.length || restrictedItems.length))
    throw new Error('Prescription and restricted medicines require an online approval workflow')
  const packageIds = Array.from(new Set(data.items.map((line) => line.packageId).filter((value): value is string => Boolean(value))))
  const packages = packageIds.length ? await db.select().from(productPackage).where(and(eq(productPackage.organizationId, orgId), inArray(productPackage.id, packageIds), eq(productPackage.isActive, true))) : []
  const packagesById = new Map(packages.map((item) => [item.id, item]))
  const normalizedItems: CartItem[] = []
  for (const line of data.items) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('Invalid sale quantity')
    const catalogueItem = catalogueById.get(line.productId)
    if (!catalogueItem?.active) throw new Error('A selected product is unavailable')
    const selectedPackage = line.packageId ? packagesById.get(line.packageId) : null
    if (line.packageId && (!selectedPackage || selectedPackage.productId !== line.productId)) throw new Error(`The selected package for ${catalogueItem.name} is unavailable`)
    const unitPrice = Number(selectedPackage?.sellingPrice ?? catalogueItem.sellingPrice)
    const baseUnitQuantity = selectedPackage?.baseUnitQuantity ?? 1
    if (offline && offlineAmountConflicts(Number(line.unitPrice), unitPrice, 0.001)) throw new Error(`Offline price conflict for ${catalogueItem.name}. Review this sale before synchronizing.`)
    normalizedItems.push({ productId: catalogueItem.id, productName: selectedPackage ? `${catalogueItem.name} (${selectedPackage.name})` : catalogueItem.name, quantity: line.quantity, unitPrice, totalPrice: unitPrice * line.quantity, packageId: selectedPackage?.id, packageName: selectedPackage?.name, baseUnitQuantity })
  }
  const serverSubtotal = normalizedItems.reduce((sum, line) => sum + line.totalPrice, 0)

  if (data.customerId) {
    const [selectedCustomer] = await db.select({ id: customer.id }).from(customer).where(and(eq(customer.id, data.customerId), eq(customer.orgId, orgId))).limit(1)
    if (!selectedCustomer) throw new Error('Customer is not available in this workspace')
  }

  // Load business settings for tax configuration
  const [settings] = await db.select().from(businessSettings)
    .where(eq(businessSettings.organizationId, orgId)).limit(1)
  
  const configuredMethods = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : []
  const allowedMethods = Array.from(new Set([...(configuredMethods.length > 0 ? configuredMethods : ['cash']), 'airtel_money']))
  if (!['cash', 'mpesa', 'airtel_money', 'card', 'bank_transfer', 'credit'].includes(data.paymentMethod)) {
    throw new Error('Unsupported POS payment method')
  }
  if (!allowedMethods.includes(data.paymentMethod)) {
    throw new Error('Payment method not enabled for this workspace')
  }
  let paymentReference = (data.paymentReference ?? data.mpesaRef ?? '').trim().slice(0, 120)
  if (data.paymentMethod === 'card' && !data.cardPaymentAttemptId) throw new Error('Record the approved physical terminal payment first')
  if (data.paymentMethod === 'bank_transfer' && !paymentReference) throw new Error('Enter the bank transfer reference')
  if (data.paymentMethod === 'airtel_money' && !paymentReference) throw new Error('Enter the Airtel Money transaction reference')
  if (data.paymentMethod === 'credit' && !data.customerId) throw new Error('Select a customer for a credit sale')
  if (data.paymentMethod === 'credit' && (!data.creditDueDate || Number.isNaN(data.creditDueDate.getTime()))) throw new Error('Select a valid due date for the customer credit')
  
  // Server-side calculation of tax (do not trust client)
  const calculatedTax = configuredTax(serverSubtotal, { enabled: settings?.taxEnabled ?? false, ratePercent: Number(settings?.taxRate ?? 0), pricesIncludeTax: settings?.pricesIncludeTax ?? false }).toNumber()
  
  // Validate discount doesn't exceed subtotal + tax
  const grossBeforeDiscount = settings?.pricesIncludeTax ? serverSubtotal : serverSubtotal + calculatedTax
  const maxDiscount = grossBeforeDiscount
  if (data.discountAmount < 0 || data.discountAmount > maxDiscount) {
    throw new Error(`Discount must be between 0 and ${maxDiscount}`)
  }
  
  // Daraja accepts whole-shilling payments. Keep the adjustment explicit and auditable.
  const shippingAmount = Number(data.shippingAmount ?? 0)
  if (!Number.isFinite(shippingAmount) || shippingAmount < 0) throw new Error('Invalid shipping amount')
  const unroundedTotal = Number((grossBeforeDiscount + shippingAmount - data.discountAmount).toFixed(2))
  const mpesaAmount = calculateMpesaAmount(unroundedTotal)
  const appliesRoundoff = data.roundoffEnabled !== false
  let calculatedTotal = appliesRoundoff ? mpesaAmount.amount : unroundedTotal
  let roundingAmount = appliesRoundoff ? mpesaAmount.roundingAmount : 0

  if (data.paymentMethod === 'mpesa') {
    throw new Error('M-Pesa sales are completed automatically by the verified Daraja callback')
  }
  if (offline && offlineAmountConflicts(Number(data.total), calculatedTotal)) throw new Error('Offline total conflicts with the current tax or pricing configuration. Review this sale before synchronizing.')
  
  // Cash validation is repeated after authoritative reward redemption inside
  // the sale transaction because rewards reduce only the external amount due.
  let changeAmount = 0
  const amountReceived = Number(data.amountReceived)
  if (data.paymentMethod === 'cash' && !Number.isFinite(amountReceived)) throw new Error('Invalid payment received')
  
  const saleId = generateId()
  const receiptNo = generateReceiptNo()
  const saleItems = normalizedItems.map((item) => ({ ...item, saleItemId: generateId() }))

  try {
    await db.transaction(async (tx) => {
    // Lock the active shift at the point the sale is committed. A shift that
    // entered reconciliation cannot accept a late checkout from another tab.
    const [lockedShift] = await tx.select({ id: posSession.id }).from(posSession).where(and(
      eq(posSession.id, activeShift.id),
      eq(posSession.orgId, orgId),
      eq(posSession.openedBy, userId),
      posAuthorization?.terminalId ? eq(posSession.terminalId, posAuthorization.terminalId) : undefined,
      eq(posSession.branchId, saleBranchId),
      eq(posSession.status, 'open'),
    )).limit(1).for('update')
    if (!lockedShift) throw new Error('This shift is no longer open. Start a new shift before completing the sale.')
    if ((data.pointsToRedeem || data.bonusToUse) && !data.customerId) throw new Error('Select a customer before using rewards')
    if ((data.pointsToRedeem || data.bonusToUse) && !saleAuthorization.permissions.includes(PermissionEnum.REWARDS_REDEEM)) throw new Error('Reward redemption permission denied')
    let lockedCreditLimit: typeof customerCreditLimit.$inferSelect | null = null
    if (data.paymentMethod === 'credit') {
      const [limit] = await tx.select().from(customerCreditLimit).where(and(eq(customerCreditLimit.customerId, data.customerId!), eq(customerCreditLimit.orgId, orgId), eq(customerCreditLimit.status, 'active'))).limit(1).for('update')
      if (!limit) throw new Error('This customer does not have an active credit limit')
      lockedCreditLimit = limit
    }
    const rewards = data.customerId ? await applySaleRewards(tx, {
      organizationId: orgId, customerId: data.customerId, branchId: saleBranchId, saleId, userId,
      lines: normalizedItems.map((item) => ({ productId: item.productId, categoryId: catalogueById.get(item.productId)?.categoryId ?? null, amount: preTaxRewardAmount(item.totalPrice, { enabled: settings?.taxEnabled ?? false, ratePercent: Number(settings?.taxRate ?? 0), pricesIncludeTax: settings?.pricesIncludeTax ?? false }), campaignAmount: item.totalPrice, discounted: data.discountAmount > 0 })),
      ordinaryDiscount: preTaxRewardAmount(data.discountAmount, { enabled: settings?.taxEnabled ?? false, ratePercent: Number(settings?.taxRate ?? 0), pricesIncludeTax: settings?.pricesIncludeTax ?? false }), pointsToRedeem: data.pointsToRedeem, bonusToUse: data.bonusToUse,
    }) : null
    const rewardAdjustedUnrounded = money(unroundedTotal - (rewards?.externalAmountReduction ?? 0))
    const rewardAdjustedMpesa = calculateMpesaAmount(rewardAdjustedUnrounded)
    calculatedTotal = appliesRoundoff ? rewardAdjustedMpesa.amount : rewardAdjustedUnrounded
    roundingAmount = appliesRoundoff ? rewardAdjustedMpesa.roundingAmount : 0
    if (calculatedTotal < 0) throw new Error('Rewards exceed the amount due')
    if (lockedCreditLimit && financeMoney(new Decimal(lockedCreditLimit.currentBalance).plus(calculatedTotal)).greaterThan(financeMoney(lockedCreditLimit.creditLimit))) throw new Error('Customer credit limit exceeded')
    if (data.paymentMethod === 'cash') {
      if (amountReceived < calculatedTotal) throw new Error('Insufficient payment received')
      changeAmount = amountReceived - calculatedTotal
    }
    let approvedCardAttempt: typeof cardPaymentAttempt.$inferSelect | null = null
    if (data.paymentMethod === 'card') {
      const [attempt] = await tx.select().from(cardPaymentAttempt).where(and(
        eq(cardPaymentAttempt.id, data.cardPaymentAttemptId!),
        eq(cardPaymentAttempt.organizationId, orgId),
        eq(cardPaymentAttempt.branchId, saleBranchId),
        eq(cardPaymentAttempt.posSessionId, activeShift.id),
        eq(cardPaymentAttempt.cashierId, userId),
        eq(cardPaymentAttempt.idempotencyKey, idempotencyKey),
      )).limit(1).for('update')
      if (!attempt) throw new Error('The approved card payment does not belong to this checkout')
      if (attempt.status === 'completed' && attempt.saleId) throw new Error('This card approval has already been used')
      if (attempt.status !== 'approved_pending_sale') throw new Error('This card approval requires reconciliation and cannot be reused')
      const [terminal] = await tx.select({ id: cardTerminal.id }).from(cardTerminal).where(and(eq(cardTerminal.id, attempt.cardTerminalId), eq(cardTerminal.organizationId, orgId), eq(cardTerminal.branchId, saleBranchId), eq(cardTerminal.isActive, true))).limit(1)
      if (!terminal) throw new Error('The selected physical card terminal is no longer active')
      if (Math.abs(Number(attempt.amount) - calculatedTotal) > 0.009) throw new Error(`Terminal approval amount does not match the sale total of ${calculatedTotal.toFixed(2)}`)
      approvedCardAttempt = attempt
      paymentReference = attempt.reference || attempt.authorizationCode
    }
    // Verify and deduct branch stock atomically through the inventory ledger.
    const costByProduct = new Map<string, { unitCost: number; totalCost: number }>()
    const lotsBySaleItem = new Map<string, Array<{ lotId: string; lotNumber: string; expiresAt: Date | null; quantity: number }>>()
    for (const item of saleItems) {
      const inventoryQuantity = baseUnitsForSale(item.quantity, item.baseUnitQuantity ?? 1)
      const movement = await applyInventoryMovement(tx, { productId: item.productId, productName: item.productName, branchId: saleBranchId, quantity: -inventoryQuantity, type: 'sale', referenceType: 'sale', referenceId: saleId, reason: receiptNo, userId, orgId })
      if (movement.lotAllocations.length) lotsBySaleItem.set(item.saleItemId, movement.lotAllocations)
      costByProduct.set(item.productId, await consumeInventoryCost(tx, { productId: item.productId, branchId: saleBranchId, orgId, quantity: inventoryQuantity }))
    }
    
    // Create the sale
    await tx.insert(sale).values({
      id: saleId,
      receiptNo,
      customerId: data.customerId,
      subtotal: String(serverSubtotal),
      taxAmount: String(calculatedTax),
      discountAmount: String(data.discountAmount),
      shippingAmount: String(shippingAmount),
      roundingAmount: String(roundingAmount),
      loyaltyPointsEarned: rewards?.pointsEarned ?? 0,
      loyaltyPointsRedeemed: rewards?.pointsRedeemed ?? 0,
      loyaltyRedemptionValue: String(rewards?.loyaltyRedemptionValue ?? 0),
      bonusRedeemed: String(rewards?.bonusRedeemed ?? 0),
      rewardEligibleSpend: String(rewards?.loyaltyEligible ?? 0),
      rewardEarningRateSnapshot: rewards ? String(rewards.settings.spendPerPoint) : null,
      rewardPointValueSnapshot: rewards ? String(rewards.settings.pointValue) : null,
      total: String(calculatedTotal),
      amountReceived: data.paymentMethod === 'cash' ? String(amountReceived) : null,
      change: data.paymentMethod === 'cash' ? String(changeAmount) : null,
      paymentMethod: data.paymentMethod,
      mpesaRef: data.paymentMethod === 'mpesa' ? paymentReference : null,
      ageVerified: Boolean(verificationEvidence),
      ageVerifiedAt: verificationEvidence ? new Date() : null,
      ageVerifiedBy: verificationEvidence ? userId : null,
      status: 'completed',
      idempotencyKey,
      origin: offline ? 'offline' : 'online',
      provisionalReceiptNo: offline?.provisionalReceiptNo ?? null,
      offlineCreatedAt: offline?.createdAt ?? null,
      syncedAt: offline ? new Date() : null,
      userId,
      orgId,
      branchId: saleBranchId,
      posSessionId: activeShift.id,
      terminalId: activeShift.terminalId,
      createdAt: offline?.createdAt,
    })
    if (requiresAgeVerification && verificationEvidence) {
      const now = new Date()
      await tx.insert(ageVerification).values({
        id: generateId(), organizationId: orgId, branchId: saleBranchId,
        terminalId: activeShift.terminalId, saleId, checkoutId: idempotencyKey,
        cashierId: userId, status: verificationEvidence.status,
        idType: verificationEvidence.idType ?? null,
        idReferenceMasked: maskAgeIdReference(verificationEvidence.idReference),
        verifiedAt: verificationEvidence.status === 'VERIFIED' ? now : null,
        overrideReason: verificationEvidence.status === 'OVERRIDDEN' ? verificationEvidence.overrideReason : null,
        overrideApprovedBy: verificationEvidence.status === 'OVERRIDDEN' ? userId : null,
        overrideApprovedAt: verificationEvidence.status === 'OVERRIDDEN' ? now : null,
      })
      await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: verificationEvidence.status === 'OVERRIDDEN' ? 'age_verification_overridden' : 'age_verified', metadata: { saleId, receiptNo, branchId: saleBranchId, terminalId: activeShift.terminalId, verificationStatus: verificationEvidence.status } })
    }

    // Process each item to create sale items and stock movements
    await tx.insert(saleItem).values(saleItems.map((item) => ({
        id: item.saleItemId,
        saleId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        packageId: item.packageId ?? null,
        packageName: item.packageName ?? null,
        baseUnitQuantity: item.baseUnitQuantity ?? 1,
        unitPrice: String(item.unitPrice),
        totalPrice: String(item.totalPrice),
        unitCostAtSale: String(costByProduct.get(item.productId)?.unitCost ?? 0),
        totalCost: String(costByProduct.get(item.productId)?.totalCost ?? 0),
        rewardEligibleAmount: String(rewards?.lineEligibility.get(item.productId) ?? 0),
        userId,
        orgId,
      })))

    const allocatedLots = saleItems.flatMap((item) => (lotsBySaleItem.get(item.saleItemId) ?? []).map((allocation) => ({
      id: generateId(), organizationId: orgId, saleId, saleItemId: item.saleItemId, productId: item.productId,
      lotId: allocation.lotId, lotNumber: allocation.lotNumber, expiresAt: allocation.expiresAt,
      quantity: String(allocation.quantity),
    })))
    if (allocatedLots.length) await tx.insert(saleItemLotAllocation).values(allocatedLots)

    if (pharmacyWorkspace && (prescriptionItems.length || restrictedItems.length)) {
      const prescriptionRecordId = generateId()
      await tx.insert(pharmacySaleRecord).values({
        id: prescriptionRecordId, organizationId: orgId, branchId: saleBranchId, saleId,
        prescriptionReference: pharmacyWorkflow?.prescriptionReference || null,
        prescriberReference: pharmacyWorkflow?.prescriberReference || null,
        patientReference: pharmacyWorkflow?.patientReference || null,
        issuedAt: pharmacyWorkflow?.issuedAt || null,
        expiresAt: pharmacyWorkflow?.expiresAt || null,
        status: 'dispensed',
        verifiedBy: userId,
        verifiedAt: new Date(),
        approvalReason: pharmacyWorkflow?.approvalReason || pharmacyWorkflow?.notes || null,
        notes: pharmacyWorkflow?.notes || null,
        approvedBy: restrictedItems.length ? userId : null,
        createdBy: userId,
      })
      const prescribedProductIds = new Set(prescriptionItems.map((item) => item.productId))
      const prescriptionLines = saleItems.filter((item) => prescribedProductIds.has(item.productId)).map((item) => ({
        id: generateId(), organizationId: orgId, prescriptionRecordId, saleItemId: item.saleItemId, productId: item.productId,
        prescribedQuantity: String(item.quantity * (item.baseUnitQuantity ?? 1)), dispensedQuantity: String(item.quantity * (item.baseUnitQuantity ?? 1)),
      }))
      if (prescriptionLines.length) await tx.insert(pharmacyPrescriptionItem).values(prescriptionLines)
      const restrictedProductIds = new Set(restrictedItems.map((item) => item.productId))
      const restrictedAuditRows = saleItems.filter((item) => restrictedProductIds.has(item.productId)).flatMap((item) => {
        const allocations = lotsBySaleItem.get(item.saleItemId) ?? []
        return (allocations.length ? allocations : [{ lotId: null, quantity: item.quantity * (item.baseUnitQuantity ?? 1) }]).map((allocation) => ({
          id: generateId(), organizationId: orgId, branchId: saleBranchId, saleId, saleItemId: item.saleItemId,
          productId: item.productId, lotId: allocation.lotId, cashierId: userId, approvedBy: userId,
          quantity: String(allocation.quantity), customerReference: data.customerId || null,
          reason: pharmacyWorkflow?.notes || 'Restricted medicine sale',
        }))
      })
      if (restrictedAuditRows.length) await tx.insert(restrictedItemAudit).values(restrictedAuditRows)
    }

    if (data.paymentMethod === 'credit') {
      const receivableId = generateId()
      await tx.insert(creditSale).values({ id: receivableId, saleId, customerId: data.customerId!, amount: financeMoney(calculatedTotal).toFixed(2), amountPaid: '0', creditedAmount: '0', dueDate: data.creditDueDate, status: 'unpaid', userId, orgId })
      const [[orgRecord], [customerRecord]] = await Promise.all([
        tx.select().from(organization).where(eq(organization.id, orgId)).limit(1),
        tx.select().from(customer).where(and(eq(customer.id, data.customerId!), eq(customer.orgId, orgId))).limit(1),
      ])
      if (!orgRecord || !customerRecord) throw new Error('Invoice snapshot context is unavailable')
      const invoiceYear = Number(new Intl.DateTimeFormat('en', { timeZone: orgRecord.timezone || 'UTC', year: 'numeric' }).format(new Date()))
      const [sequence] = await tx.insert(invoiceNumberSequence).values({ organizationId: orgId, year: invoiceYear, lastNumber: 1 }).onConflictDoUpdate({ target: [invoiceNumberSequence.organizationId, invoiceNumberSequence.year], set: { lastNumber: sql`${invoiceNumberSequence.lastNumber} + 1`, updatedAt: new Date() } }).returning({ lastNumber: invoiceNumberSequence.lastNumber })
      const invoiceNo = `INV-${invoiceYear}-${String(sequence.lastNumber).padStart(6, '0')}`
      const invoiceId = generateId()
      const invoiceDiscount = financeMoney(data.discountAmount + (rewards?.externalAmountReduction ?? 0))
      const invoiceState = paymentStatus(calculatedTotal, 0, data.creditDueDate ?? null)
      await tx.insert(invoice).values({
        id: invoiceId, invoiceNo, branchId: saleBranchId, saleId, creditSaleId: receivableId, customerId: data.customerId,
        customerSnapshot: { name: customerRecord.name, phone: customerRecord.phone, email: customerRecord.email, address: customerRecord.address, kraPin: customerRecord.kraPin },
        businessSnapshot: { name: settings?.receiptBusinessName || settings?.displayName || orgRecord.name, address: settings?.receiptAddress || settings?.address, phone: settings?.receiptPhone || orgRecord.phone, email: orgRecord.businessEmail, kraPin: settings?.taxIdentifier, logoUrl: settings?.receiptLogoUrl, taxName: settings?.taxName || 'Tax' },
        subtotal: financeMoney(serverSubtotal).toFixed(2), discountAmount: invoiceDiscount.toFixed(2), shippingAmount: financeMoney(shippingAmount).toFixed(2), roundingAmount: financeMoney(roundingAmount).toFixed(2), taxableAmount: financeMoney(settings?.pricesIncludeTax ? new Decimal(serverSubtotal).minus(calculatedTax) : serverSubtotal).toFixed(2), taxRate: String(settings?.taxEnabled ? Number(settings.taxRate ?? 0) : 0), taxAmount: financeMoney(calculatedTax).toFixed(2), total: financeMoney(calculatedTotal).toFixed(2), amountPaid: '0', creditedAmount: '0', balanceDue: invoiceState.balance.toFixed(2), fiscalStatus: 'not_submitted', idempotencyKey: `pos-credit:${idempotencyKey}`, dueDate: data.creditDueDate, issuedAt: new Date(), status: invoiceState.status, userId, orgId,
      })
      let allocatedTax = financeMoney(0)
      let allocatedDiscount = financeMoney(0)
      await tx.insert(invoiceItem).values(saleItems.map((item, index) => {
        const gross = financeMoney(item.totalPrice)
        const last = index === saleItems.length - 1
        const taxShare = last ? financeMoney(new Decimal(calculatedTax).minus(allocatedTax)) : financeMoney(serverSubtotal > 0 ? new Decimal(calculatedTax).mul(gross).div(serverSubtotal) : 0)
        const discountShare = last ? financeMoney(invoiceDiscount.minus(allocatedDiscount)) : financeMoney(serverSubtotal > 0 ? invoiceDiscount.mul(gross).div(serverSubtotal) : 0)
        allocatedTax = financeMoney(allocatedTax.plus(taxShare)); allocatedDiscount = financeMoney(allocatedDiscount.plus(discountShare))
        const lineTotal = financeMoney(settings?.pricesIncludeTax ? gross.minus(discountShare) : gross.plus(taxShare).minus(discountShare))
        return { id: generateId(), invoiceId, description: item.productName, quantity: item.quantity, unitPrice: financeMoney(item.unitPrice).toFixed(2), sku: null, unit: item.packageName || 'each', discountAmount: '0', invoiceDiscountShare: discountShare.toFixed(2), taxRate: String(settings?.taxEnabled ? Number(settings.taxRate ?? 0) : 0), taxAmount: taxShare.toFixed(2), total: lineTotal.toFixed(2), orgId }
      }))
      await tx.update(customerCreditLimit).set({ currentBalance: financeMoney(new Decimal(lockedCreditLimit!.currentBalance).plus(calculatedTotal)).toFixed(2), updatedAt: new Date() }).where(eq(customerCreditLimit.id, lockedCreditLimit!.id))
      await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'credit_sale_created', metadata: { creditSaleId: receivableId, saleId, customerId: data.customerId, branchId: saleBranchId, amount: financeMoney(calculatedTotal).toFixed(2), dueDate: data.creditDueDate?.toISOString() } })
      await tx.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'invoice.created', metadata: { invoiceId, invoiceNo, branchId: saleBranchId, customerId: data.customerId, saleId, creditSaleId: receivableId, total: financeMoney(calculatedTotal).toFixed(2), source: 'pos_credit_sale' } })
    } else {
      await tx.insert(salePayment).values({
        id: generateId(), saleId, method: data.paymentMethod, amount: String(calculatedTotal),
        reference: paymentReference || null, status: 'completed', userId, orgId,
        cardTerminalId: approvedCardAttempt?.cardTerminalId ?? null,
        authorizationCode: approvedCardAttempt?.authorizationCode ?? null,
        cardBrand: approvedCardAttempt?.cardBrand ?? null,
        cardLast4: approvedCardAttempt?.last4 ?? null,
        cardEntryMode: approvedCardAttempt?.entryMode ?? null,
      })
    }

    if (approvedCardAttempt) await tx.update(cardPaymentAttempt).set({ status: 'completed', saleId, recoveredAt: new Date(), updatedAt: new Date() }).where(eq(cardPaymentAttempt.id, approvedCardAttempt.id))
    
    // Create audit event
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'sale_created',
      metadata: {
        saleId,
        receiptNo,
        subtotal: serverSubtotal,
        tax: calculatedTax,
        discount: data.discountAmount,
        rounding: roundingAmount,
        total: calculatedTotal,
        loyaltyPointsEarned: rewards?.pointsEarned ?? 0,
        loyaltyPointsRedeemed: rewards?.pointsRedeemed ?? 0,
        loyaltyRedemptionValue: rewards?.loyaltyRedemptionValue ?? 0,
        bonusRedeemed: rewards?.bonusRedeemed ?? 0,
        items: normalizedItems.length,
        paymentMethod: data.paymentMethod,
        ageVerification: requiresAgeVerification
          ? { status: data.ageVerified ? 'verified' : 'missing' }
          : null,
        cardPaymentAttemptId: approvedCardAttempt?.id ?? null,
        cardTerminalId: approvedCardAttempt?.cardTerminalId ?? null,
        cardBrand: approvedCardAttempt?.cardBrand ?? null,
        cardLast4: approvedCardAttempt?.last4 ?? null,
        amountReceived: data.paymentMethod === 'cash' ? amountReceived : null,
        change: data.paymentMethod === 'cash' ? changeAmount : null,
        paymentReceiver: data.paymentReceiver?.trim().slice(0, 120) || null,
        paymentNote: data.paymentNote?.trim().slice(0, 500) || null,
        saleNote: data.saleNote?.trim().slice(0, 500) || null,
        staffNote: data.staffNote?.trim().slice(0, 500) || null,
        origin: offline ? 'offline' : 'online',
        provisionalReceiptNo: offline?.provisionalReceiptNo ?? null,
      },
    })
    })
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } }
    if (databaseError.code === '23505' || databaseError.cause?.code === '23505') {
      const [duplicate] = await db.select().from(sale).where(and(eq(sale.orgId, orgId), eq(sale.idempotencyKey, idempotencyKey))).limit(1)
      if (duplicate) {
        const duplicateItems = await db.select({ saleItemId: saleItem.id, productId: saleItem.productId })
          .from(saleItem).where(and(eq(saleItem.saleId, duplicate.id), eq(saleItem.orgId, orgId)))
        let etims: Awaited<ReturnType<typeof enqueueEtimsInvoice>> | { status: 'PENDING'; message: string }
        try { etims = await enqueueEtimsInvoice(duplicate.id) }
        catch { etims = { status: 'PENDING', message: 'Sale completed. eTIMS submission will require reconciliation.' } }
        return {
          saleId: duplicate.id,
          receiptNo: duplicate.receiptNo,
          tax: Number(duplicate.taxAmount),
          rounding: Number(duplicate.roundingAmount),
          total: Number(duplicate.total),
          idempotencyKey,
          items: duplicateItems,
          isDuplicate: true,
          etims,
        }
      }
    }
    throw error
  }

  await invalidateProductReadCache(orgId)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sales')
  let etims: Awaited<ReturnType<typeof enqueueEtimsInvoice>> | { status: 'PENDING'; message: string }
  try { etims = await enqueueEtimsInvoice(saleId) }
  catch { etims = { status: 'PENDING', message: 'Sale completed. eTIMS submission will require reconciliation.' } }
  await syncLinkedInvoiceFiscalStatus(saleId, orgId)
  return { saleId, receiptNo, tax: calculatedTax, rounding: roundingAmount, total: calculatedTotal, idempotencyKey, items: saleItems.map(({ saleItemId, productId }) => ({ saleItemId, productId })), etims }
}

const offlineSaleSyncSchema = z.object({
  queueId: z.string().uuid(),
  provisionalReceiptNo: z.string().trim().regex(/^OFF-[A-Z0-9-]{8,40}$/),
  offlineCreatedAt: z.string().datetime(),
  sessionId: z.string().min(1).max(120),
  customerId: z.string().min(1).optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    productName: z.string().min(1).max(240),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    totalPrice: z.number().nonnegative(),
    packageId: z.string().min(1).optional(),
    packageName: z.string().min(1).max(120).optional(),
    baseUnitQuantity: z.number().int().positive().optional(),
  })).min(1).max(250),
  subtotal: z.number().nonnegative(),
  discountAmount: z.number().nonnegative(),
  shippingAmount: z.number().nonnegative().default(0),
  roundoffEnabled: z.boolean().default(true),
  total: z.number().nonnegative(),
  amountReceived: z.number().nonnegative(),
  ageVerified: z.boolean(),
})

export type OfflineSaleSyncInput = z.input<typeof offlineSaleSyncSchema>

/** Replays one browser-queued cash sale through the authoritative online sale path. */
export async function syncOfflineSale(input: OfflineSaleSyncInput) {
  const data = offlineSaleSyncSchema.parse(input)
  const posAuthorization = await getPosAuthorizationContext()
  const userId = posAuthorization?.userId ?? await getUserId()
  const authorization = posAuthorization ?? await requireAnyPermission([PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE])
  if (!authorization.permissions.includes(PermissionEnum.POS_SELL) && !authorization.permissions.includes(PermissionEnum.SALE_CREATE)) throw new Error('POS sale permission denied')
  const orgId = posAuthorization?.organizationId ?? await getOrgId(userId, 'pos')
  const [session] = await db.select({ id: posSession.id, branchId: posSession.branchId, terminalId: posSession.terminalId, openedBy: posSession.openedBy }).from(posSession)
    .where(and(eq(posSession.id, data.sessionId), eq(posSession.orgId, orgId), eq(posSession.openedBy, userId))).limit(1)
  if (!session?.branchId) throw new Error('The original offline-sale shift is unavailable')
  if (!authorization.isOrganizationWide && !authorization.branchIds.includes(session.branchId)) throw new Error('The offline sale belongs to an unauthorized branch')
  if (posAuthorization?.terminalId && session.terminalId !== posAuthorization.terminalId) throw new Error('Synchronize this offline sale from its original register')

  const payloadHash = createHash('sha256').update(JSON.stringify(data)).digest('hex')
  const [existing] = await db.select().from(offlineSaleSync).where(and(eq(offlineSaleSync.organizationId, orgId), eq(offlineSaleSync.idempotencyKey, data.queueId))).limit(1)
  if (existing && existing.payloadHash !== payloadHash) throw new Error('Offline transaction ID was reused with different sale details')

  const syncId = existing?.id ?? generateId()
  await db.insert(offlineSaleSync).values({
    id: syncId, organizationId: orgId, branchId: session.branchId, sessionId: session.id, terminalId: session.terminalId,
    userId, idempotencyKey: data.queueId, provisionalReceiptNo: data.provisionalReceiptNo, payloadHash,
    status: 'RECEIVED', attemptCount: 1, offlineCreatedAt: new Date(data.offlineCreatedAt), lastAttemptAt: new Date(),
  }).onConflictDoUpdate({ target: [offlineSaleSync.organizationId, offlineSaleSync.idempotencyKey], set: {
    status: existing?.status === 'ACCEPTED' ? 'ACCEPTED' : 'RECEIVED',
    attemptCount: sql`${offlineSaleSync.attemptCount} + 1`, lastAttemptAt: new Date(), errorCode: null, errorMessage: null, updatedAt: new Date(),
  } })

  try {
    const result = await createSale({
      customerId: data.customerId,
      items: data.items,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      shippingAmount: data.shippingAmount,
      roundoffEnabled: data.roundoffEnabled,
      total: data.total,
      paymentMethod: 'cash',
      amountReceived: data.amountReceived,
      idempotencyKey: data.queueId,
      ageVerified: data.ageVerified,
      offline: { queueId: data.queueId, provisionalReceiptNo: data.provisionalReceiptNo, createdAt: new Date(data.offlineCreatedAt), sessionId: data.sessionId },
    })
    await db.update(offlineSaleSync).set({ status: 'ACCEPTED', saleId: result.saleId, syncedAt: new Date(), errorCode: null, errorMessage: null, updatedAt: new Date() })
      .where(and(eq(offlineSaleSync.id, syncId), eq(offlineSaleSync.organizationId, orgId)))
    await db.insert(auditEvent).values({ id: generateId(), organizationId: orgId, userId, action: 'offline_sale_synchronized', metadata: {
      syncId, saleId: result.saleId, receiptNo: result.receiptNo, provisionalReceiptNo: data.provisionalReceiptNo,
      offlineCreatedAt: data.offlineCreatedAt, synchronizationDelaySeconds: Math.max(0, Math.round((Date.now() - new Date(data.offlineCreatedAt).getTime()) / 1000)),
    } })
    return { ...result, offlineSync: { status: 'ACCEPTED' as const, provisionalReceiptNo: data.provisionalReceiptNo } }
  } catch (error) {
    const message = (error instanceof Error ? error.message : 'Offline sale synchronization failed').slice(0, 500)
    const errorCode = classifyOfflineSyncError(message)
    await db.update(offlineSaleSync).set({ status: 'FAILED', errorCode, errorMessage: message, updatedAt: new Date() })
      .where(and(eq(offlineSaleSync.id, syncId), eq(offlineSaleSync.organizationId, orgId)))
    throw new Error(message)
  }
}

export async function getSales(limit = 50) {
  const userId = await getUserId()
  const authorization = await requireAnyPermission([PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL, PermissionEnum.SALE_VIEW])
  const orgId = await getOrgId(userId)
  const canViewAll = authorization.permissions.includes(PermissionEnum.SALES_VIEW_ALL)
  const accessScope = canViewAll
    ? authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`
    : eq(sale.userId, userId)
  const query = db
    .select()
    .from(sale)
    .where(and(eq(sale.orgId, orgId), accessScope))
    .orderBy(desc(sale.createdAt))
    .limit(limit)
  return query
}

export type SalesPageFilters = {
  search?: string
  paymentMethod?: string
  status?: string
  ageVerification?: 'verified' | 'not_verified'
  customerId?: string
  cashierId?: string
  branchId?: string
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
  sort?: 'date' | 'amount' | 'payment' | 'status'
  direction?: 'asc' | 'desc'
}

type SalesScope = Awaited<ReturnType<typeof getSalesScope>>

function endOfDayExclusive(value?: Date) {
  if (!value) return undefined
  const end = new Date(value)
  end.setDate(end.getDate() + 1)
  return end
}

async function getSalesScope(filters: SalesPageFilters) {
  const userId = await getUserId()
  const authorization = await requireAnyPermission([PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL, PermissionEnum.SALE_VIEW])
  const orgId = await getOrgId(userId)
  const canViewAll = authorization.permissions.includes(PermissionEnum.SALES_VIEW_ALL)
  const accessScope = canViewAll
    ? authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`
    : eq(sale.userId, userId)
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50))
  const search = filters.search?.trim().slice(0, 80)
  const scope = and(
    eq(sale.orgId, orgId), accessScope,
    search ? or(ilike(sale.receiptNo, `%${search}%`), ilike(sql`coalesce(${sale.mpesaRef}, '')`, `%${search}%`), sql`exists (select 1 from ${salePayment} where ${salePayment.saleId} = ${sale.id} and ${salePayment.orgId} = ${orgId} and coalesce(${salePayment.reference}, '') ilike ${`%${search}%`})`) : undefined,
    filters.paymentMethod && filters.paymentMethod !== 'all' ? eq(sale.paymentMethod, filters.paymentMethod) : undefined,
    filters.status && filters.status !== 'all' ? eq(sale.status, filters.status) : undefined,
    filters.ageVerification === 'verified' ? eq(sale.ageVerified, true) : filters.ageVerification === 'not_verified' ? eq(sale.ageVerified, false) : undefined,
    filters.customerId ? eq(sale.customerId, filters.customerId) : undefined,
    filters.cashierId ? eq(sale.userId, filters.cashierId) : undefined,
    filters.branchId ? eq(sale.branchId, filters.branchId) : undefined,
    filters.from ? gte(sale.createdAt, filters.from) : undefined,
    endOfDayExclusive(filters.to) ? lt(sale.createdAt, endOfDayExclusive(filters.to)!) : undefined,
  )
  return { userId, authorization, orgId, scope, page, pageSize }
}

function previousPeriod(filters: SalesPageFilters) {
  if (!filters.from || !filters.to) return null
  const start = new Date(filters.from); start.setHours(0, 0, 0, 0)
  const end = endOfDayExclusive(filters.to)!
  const duration = end.getTime() - start.getTime()
  return { ...filters, from: new Date(start.getTime() - duration), to: new Date(start.getTime() - 1), page: 1 }
}

async function getScopedTotals(scope: NonNullable<SalesScope['scope']>, orgId: string, filters: SalesPageFilters) {
  const paidStatuses = ['completed', 'partially_refunded', 'refunded']
  const [[salesTotals], [refundTotals], [itemTotals], [refundedCost], [expenseTotals]] = await Promise.all([
    db.select({
      gross: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') then ${sale.total} else 0 end), 0)`,
      transactions: sql<number>`count(*) filter (where ${sale.status} in ('completed', 'partially_refunded', 'refunded'))`,
      cash: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'cash' then ${sale.total} else 0 end), 0)`,
      mpesa: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'mpesa' then ${sale.total} else 0 end), 0)`,
      card: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'card' then ${sale.total} else 0 end), 0)`,
      split: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'split' then ${sale.total} else 0 end), 0)`,
      credit: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') and ${sale.paymentMethod} = 'credit' then ${sale.total} else 0 end), 0)`,
      pending: sql<string>`coalesce(sum(case when ${sale.status} = 'pending' then ${sale.total} else 0 end), 0)`,
      tax: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') then ${sale.taxAmount} else 0 end), 0)`,
      discounts: sql<string>`coalesce(sum(case when ${sale.status} in ('completed', 'partially_refunded', 'refunded') then ${sale.discountAmount} else 0 end), 0)`,
    }).from(sale).where(scope),
    db.select({ total: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`, count: sql<number>`count(*)` }).from(salesReturn).innerJoin(sale, eq(sale.id, salesReturn.saleId)).where(and(scope, eq(salesReturn.orgId, orgId), eq(salesReturn.status, 'completed'))),
    db.select({ quantity: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`, cogs: sql<string>`coalesce(sum(${saleItem.totalCost}), 0)` }).from(saleItem).innerJoin(sale, eq(sale.id, saleItem.saleId)).where(and(scope, inArray(sale.status, paidStatuses))),
    db.select({ cost: sql<string>`coalesce(sum(${saleItem.totalCost} * ${salesReturnItem.quantity} / nullif(${saleItem.quantity}, 0)), 0)` }).from(salesReturnItem).innerJoin(salesReturn, eq(salesReturn.id, salesReturnItem.returnId)).innerJoin(sale, eq(sale.id, salesReturn.saleId)).innerJoin(saleItem, and(eq(saleItem.saleId, sale.id), eq(saleItem.productId, salesReturnItem.productId))).where(and(scope, eq(salesReturn.orgId, orgId), eq(salesReturn.status, 'completed'))),
    db.select({ total: sql<string>`coalesce(sum(${expense.amount}), 0)` }).from(expense).where(and(eq(expense.orgId, orgId), eq(expense.status, 'effective'), filters.branchId ? eq(expense.branchId, filters.branchId) : undefined, filters.from ? gte(expense.createdAt, filters.from) : undefined, endOfDayExclusive(filters.to) ? lt(expense.createdAt, endOfDayExclusive(filters.to)!) : undefined)),
  ])
  const gross = Number(salesTotals?.gross ?? 0), refunds = Number(refundTotals?.total ?? 0), cogs = Math.max(0, Number(itemTotals?.cogs ?? 0) - Number(refundedCost?.cost ?? 0)), net = gross - refunds, grossProfit = net - cogs, expensesTotal = Number(expenseTotals?.total ?? 0)
  return { ...salesTotals, refunds, refundCount: Number(refundTotals?.count ?? 0), net, quantity: Number(itemTotals?.quantity ?? 0), cogs, grossProfit, grossMargin: net ? grossProfit / net * 100 : 0, expenses: expensesTotal, netProfit: grossProfit - expensesTotal, average: Number(salesTotals?.transactions ?? 0) ? net / Number(salesTotals?.transactions) : 0 }
}

/** Server-side source of truth for the Sales page. The table and KPIs share this scope. */
export async function getSalesPageData(filters: SalesPageFilters = {}) {
  const { orgId, authorization, scope, page, pageSize } = await getSalesScope(filters)
  const orderColumn = filters.sort === 'amount' ? sale.total : filters.sort === 'payment' ? sale.paymentMethod : filters.sort === 'status' ? sale.status : sale.createdAt
  const order = (filters.direction ?? 'desc') === 'asc' ? asc(orderColumn) : desc(orderColumn)
  const [rows, [count], totals, locations] = await Promise.all([
    db.select({ record: sale, customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email, branchName: branch.name, cashierName: user.name })
      .from(sale)
      .leftJoin(customer, eq(customer.id, sale.customerId))
      .leftJoin(branch, eq(branch.id, sale.branchId))
      .leftJoin(user, eq(user.id, sale.userId))
      .where(scope).orderBy(order, desc(sale.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: sql<number>`count(*)` }).from(sale).where(scope),
    getScopedTotals(scope!, orgId, filters),
    db.select({ id: branch.id, name: branch.name }).from(branch).where(and(eq(branch.organizationId, orgId), authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(branch.id, authorization.branchIds) : sql`false`)).orderBy(desc(branch.isMain), branch.name),
  ])
  const previous = previousPeriod(filters)
  const previousTotals = previous ? await getScopedTotals((await getSalesScope(previous)).scope!, orgId, previous) : null
  const compare = (current: number, prior: number) => prior ? ((current - prior) / Math.abs(prior)) * 100 : null
  const fallbackBranchName = locations.length === 1 ? locations[0].name : null
  const consistentRows = rows.map((row) => ({ ...row, branchName: row.branchName ?? fallbackBranchName }))
  return { rows: consistentRows, total: Number(count?.value ?? 0), page, pageSize, totals, comparison: previousTotals ? { net: compare(totals.net, previousTotals.net), transactions: compare(Number(totals.transactions ?? 0), Number(previousTotals.transactions ?? 0)), average: compare(totals.average, previousTotals.average), grossProfit: compare(totals.grossProfit, previousTotals.grossProfit) } : null }
}

export async function getSalesFilterOptions() {
  const { orgId, scope } = await getSalesScope({})
  const [customers, cashiers, branches] = await Promise.all([
    db.selectDistinct({ id: customer.id, name: customer.name }).from(sale).innerJoin(customer, eq(customer.id, sale.customerId)).where(scope).orderBy(customer.name).limit(500),
    db.selectDistinct({ id: user.id, name: user.name }).from(sale).innerJoin(user, eq(user.id, sale.userId)).where(scope).orderBy(user.name).limit(200),
    db.select({ id: branch.id, name: branch.name }).from(branch).where(eq(branch.organizationId, orgId)).orderBy(branch.name),
  ])
  return { customers, cashiers, branches }
}

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

/** Exports the entire authorized, filtered result set; it never reuses page rows. */
export async function exportSalesCsv(filters: SalesPageFilters = {}) {
  await requirePermission(PermissionEnum.REPORT_EXPORT)
  const { orgId, scope } = await getSalesScope({ ...filters, page: 1, pageSize: 100 })
  const rows = await db.select({
    receipt: sale.receiptNo, date: sale.createdAt, customer: customer.name, cashier: user.name, branch: branch.name,
    subtotal: sale.subtotal, discount: sale.discountAmount, tax: sale.taxAmount, total: sale.total, method: sale.paymentMethod, reference: sale.mpesaRef, status: sale.status,
    refunds: sql<string>`coalesce((select sum(${salesReturn.amount}) from ${salesReturn} where ${salesReturn.saleId} = ${sale.id} and ${salesReturn.orgId} = ${orgId} and ${salesReturn.status} = 'completed'), 0)`,
    cogs: sql<string>`coalesce((select sum(${saleItem.totalCost}) from ${saleItem} where ${saleItem.saleId} = ${sale.id} and ${saleItem.orgId} = ${orgId}), 0)`,
  }).from(sale).leftJoin(customer, eq(customer.id, sale.customerId)).leftJoin(user, eq(user.id, sale.userId)).leftJoin(branch, eq(branch.id, sale.branchId)).where(scope).orderBy(desc(sale.createdAt))
  const header = ['Receipt', 'Date', 'Customer', 'Cashier', 'Branch', 'Subtotal', 'Discount', 'Tax', 'Gross amount', 'Refund', 'Net amount', 'COGS', 'Gross profit', 'Payment method', 'Payment reference', 'Status']
  const lines = rows.map((row) => { const gross = Number(row.total), refunds = Number(row.refunds), cogs = Number(row.cogs), net = gross - refunds; return [row.receipt, row.date.toISOString(), row.customer ?? 'Walk-in', row.cashier ?? '', row.branch ?? '', row.subtotal, row.discount, row.tax, gross.toFixed(2), refunds.toFixed(2), net.toFixed(2), cogs.toFixed(2), (net - cogs).toFixed(2), row.method, row.reference ?? '', row.status].map(csvCell).join(',') })
  return [header.map(csvCell).join(','), ...lines].join('\n')
}

export async function getSalesAnalytics(filters: SalesPageFilters = {}) {
  const { scope } = await getSalesScope(filters)
  const paid = inArray(sale.status, ['completed', 'partially_refunded', 'refunded'])
  const [trend, payments, products, cashiers, customers] = await Promise.all([
    db.select({ label: sql<string>`to_char(${sale.createdAt}, 'YYYY-MM-DD')`, value: sql<number>`coalesce(sum(${sale.total}), 0)` }).from(sale).where(and(scope, paid)).groupBy(sql`to_char(${sale.createdAt}, 'YYYY-MM-DD')`).orderBy(sql`to_char(${sale.createdAt}, 'YYYY-MM-DD')`).limit(366),
    db.select({ label: sale.paymentMethod, value: sql<number>`coalesce(sum(${sale.total}), 0)` }).from(sale).where(and(scope, paid)).groupBy(sale.paymentMethod).orderBy(desc(sql`sum(${sale.total})`)),
    db.select({ label: saleItem.productName, quantity: sql<number>`coalesce(sum(${saleItem.quantity}), 0)`, value: sql<number>`coalesce(sum(${saleItem.totalPrice}), 0)`, profit: sql<number>`coalesce(sum(${saleItem.totalPrice} - ${saleItem.totalCost}), 0)` }).from(saleItem).innerJoin(sale, eq(sale.id, saleItem.saleId)).where(and(scope, paid)).groupBy(saleItem.productName).orderBy(desc(sql`sum(${saleItem.totalPrice})`)).limit(10),
    db.select({ label: user.name, quantity: sql<number>`count(*)`, value: sql<number>`coalesce(sum(${sale.total}), 0)` }).from(sale).leftJoin(user, eq(user.id, sale.userId)).where(and(scope, paid)).groupBy(user.name).orderBy(desc(sql`sum(${sale.total})`)).limit(10),
    db.select({ label: customer.name, quantity: sql<number>`count(*)`, value: sql<number>`coalesce(sum(${sale.total}), 0)` }).from(sale).innerJoin(customer, eq(customer.id, sale.customerId)).where(and(scope, paid)).groupBy(customer.name).orderBy(desc(sql`sum(${sale.total})`)).limit(10),
  ])
  // SQL returns only active sale dates. The dashboard must plot every calendar day
  // to preserve elapsed-time spacing and make no-sale days visible.
  const trendByDate = new Map(trend.map((row) => [row.label, Number(row.value)]))
  const end = filters.to ? new Date(filters.to) : new Date()
  end.setHours(0, 0, 0, 0)
  const start = filters.from ? new Date(filters.from) : new Date(end)
  if (!filters.from) start.setDate(start.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  const completeTrend = [] as Array<{ label: string; timestamp: number; value: number }>
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const label = day.toISOString().slice(0, 10)
    completeTrend.push({ label, timestamp: day.getTime(), value: trendByDate.get(label) ?? 0 })
  }
  return { trend: completeTrend, payments, products, cashiers, customers }
}

export async function getSaleWithItems(saleId: string) {
  const userId = await getUserId()
  const authorization = await requireAnyPermission([PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL, PermissionEnum.SALE_VIEW])
  const orgId = await getOrgId(userId)
  const canViewAll = authorization.permissions.includes(PermissionEnum.SALES_VIEW_ALL)
  const canViewCost = authorization.role === RoleEnum.OWNER || authorization.role === RoleEnum.ADMIN
  const accessScope = canViewAll
    ? authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`
    : eq(sale.userId, userId)
  const [saleRecord] = await db
    .select({ record: sale, customerName: customer.name, customerPhone: customer.phone, customerEmail: customer.email, cashierName: user.name, branchName: branch.name })
    .from(sale)
    .leftJoin(customer, eq(customer.id, sale.customerId))
    .leftJoin(user, eq(user.id, sale.userId))
    .leftJoin(branch, eq(branch.id, sale.branchId))
    .where(and(eq(sale.id, saleId), eq(sale.orgId, orgId), accessScope))
    .limit(1)
  if (!saleRecord) return null
  const [items, payments, returns, session, refundItems, audit, fiscalRows, lotAllocations, pharmacyRecords] = await Promise.all([
    db.select({
      item: saleItem,
      sku: product.sku,
      barcode: product.barcode,
      imageUrl: product.imageUrl,
      categoryName: category.name,
      genericName: pharmacyProduct.genericName,
      strength: pharmacyProduct.strength,
      dosageForm: pharmacyProduct.dosageForm,
      manufacturer: pharmacyProduct.manufacturer,
      prescriptionRequired: pharmacyProduct.prescriptionRequired,
      restrictedItem: pharmacyProduct.restrictedItem,
    }).from(saleItem)
      .leftJoin(product, and(eq(product.id, saleItem.productId), eq(product.orgId, orgId)))
      .leftJoin(category, and(eq(category.id, product.categoryId), eq(category.orgId, orgId)))
      .leftJoin(pharmacyProduct, and(eq(pharmacyProduct.productId, saleItem.productId), eq(pharmacyProduct.organizationId, orgId)))
      .where(and(eq(saleItem.saleId, saleId), eq(saleItem.orgId, orgId))),
    db.select().from(salePayment).where(and(eq(salePayment.saleId, saleId), eq(salePayment.orgId, orgId))).orderBy(salePayment.createdAt),
    db.select({ refund: salesReturn, userName: user.name }).from(salesReturn).leftJoin(user, eq(user.id, salesReturn.userId)).where(and(eq(salesReturn.saleId, saleId), eq(salesReturn.orgId, orgId))).orderBy(desc(salesReturn.createdAt)),
    saleRecord.record.posSessionId ? db.select().from(posSession).where(and(eq(posSession.id, saleRecord.record.posSessionId), eq(posSession.orgId, orgId))).limit(1) : Promise.resolve([]),
    db.select({ item: salesReturnItem, returnNo: salesReturn.returnNo }).from(salesReturnItem).innerJoin(salesReturn, eq(salesReturn.id, salesReturnItem.returnId)).where(and(eq(salesReturnItem.orgId, orgId), eq(salesReturn.saleId, saleId))),
    db.select({ event: auditEvent, userName: user.name }).from(auditEvent).leftJoin(user, eq(user.id, auditEvent.userId)).where(and(eq(auditEvent.organizationId, orgId), sql`${auditEvent.metadata}->>'saleId' = ${saleId}`)).orderBy(desc(auditEvent.createdAt)).limit(50),
    db.select({ status: etimsSubmission.status, environment: etimsSubmission.environment, invoiceNumber: etimsSubmission.invoiceNumber,
      controlNumber: etimsSubmission.controlNumber, receiptNumber: etimsSubmission.receiptNumber, internalReference: etimsSubmission.internalReference,
      qrData: etimsSubmission.qrData, verificationData: etimsSubmission.verificationData, errorMessage: etimsSubmission.errorMessage,
      receiptDetailsEnabled: etimsConfiguration.receiptDetailsEnabled,
    }).from(etimsSubmission).innerJoin(etimsConfiguration, eq(etimsConfiguration.id, etimsSubmission.configurationId)).where(and(eq(etimsSubmission.saleId, saleId), eq(etimsSubmission.organizationId, orgId))).limit(1),
    db.select({
      saleItemId: saleItemLotAllocation.saleItemId,
      lotNumber: saleItemLotAllocation.lotNumber,
      expiresAt: saleItemLotAllocation.expiresAt,
      quantity: saleItemLotAllocation.quantity,
    }).from(saleItemLotAllocation).where(and(
      eq(saleItemLotAllocation.saleId, saleId),
      eq(saleItemLotAllocation.organizationId, orgId),
    )).orderBy(saleItemLotAllocation.createdAt),
    db.select().from(pharmacySaleRecord).where(and(
      eq(pharmacySaleRecord.saleId, saleId),
      eq(pharmacySaleRecord.organizationId, orgId),
    )).limit(1),
  ])
  const allocationsByItem = new Map<string, typeof lotAllocations>()
  for (const allocation of lotAllocations) {
    allocationsByItem.set(allocation.saleItemId, [...(allocationsByItem.get(allocation.saleItemId) ?? []), allocation])
  }
  const safeItems = items.map(({ item, ...meta }) => {
    const { unitCostAtSale, totalCost, ...publicItem } = item
    return canViewCost
      ? { ...publicItem, ...meta, lotAllocations: allocationsByItem.get(item.id) ?? [], unitCostAtSale, totalCost }
      : { ...publicItem, ...meta, lotAllocations: allocationsByItem.get(item.id) ?? [] }
  })
  return { ...saleRecord, items: safeItems, canViewCost, payments, returns: returns.map(({ refund, ...meta }) => ({ ...refund, ...meta })), session: session[0] ?? null, refundItems, audit, etims: fiscalRows[0] ?? null, pharmacyRecord: pharmacyRecords[0] ?? null }
}

export async function getDashboardStats() {
  const userId = await getUserId()
  const authorization = await requireAnyPermission([PermissionEnum.SALES_VIEW_ALL, PermissionEnum.REPORT_VIEW])
  const orgId = await getOrgId(userId)
  const saleScope = authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todaySales] = await db
    .select({ total: sql<string>`COALESCE(SUM(${sale.total}), 0)`, count: sql<number>`COUNT(*)` })
    .from(sale)
    .where(and(eq(sale.orgId, orgId), saleScope, gte(sale.createdAt, today)))

  const [monthSales] = await db
    .select({ total: sql<string>`COALESCE(SUM(${sale.total}), 0)`, count: sql<number>`COUNT(*)` })
    .from(sale)
    .where(and(eq(sale.orgId, orgId), saleScope, gte(sale.createdAt, monthStart)))

  const [productCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(product)
    .where(eq(product.orgId, orgId))

  const lowStockProducts = await db
    .select()
    .from(product)
    .where(and(eq(product.orgId, orgId), sql`${product.stock} <= ${product.minStock}`))

  // Last 7 days revenue
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const weeklyRevenue = await db
    .select({
      date: sql<string>`DATE(${sale.createdAt})`,
      revenue: sql<string>`COALESCE(SUM(${sale.total}), 0)`,
    })
    .from(sale)
    .where(and(eq(sale.orgId, orgId), saleScope, gte(sale.createdAt, sevenDaysAgo)))
    .groupBy(sql`DATE(${sale.createdAt})`)
    .orderBy(sql`DATE(${sale.createdAt})`)

  const recentSales = await db
    .select()
    .from(sale)
    .where(and(eq(sale.orgId, orgId), saleScope))
    .orderBy(desc(sale.createdAt))
    .limit(5)

  return {
    todayRevenue: parseFloat(todaySales.total || '0'),
    todaySalesCount: Number(todaySales.count),
    monthRevenue: parseFloat(monthSales.total || '0'),
    monthSalesCount: Number(monthSales.count),
    productCount: Number(productCount.count),
    lowStockCount: lowStockProducts.length,
    lowStockProducts,
    weeklyRevenue,
    recentSales,
  }
}
