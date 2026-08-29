'use server'

import Decimal from 'decimal.js'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAuthorizationContext, hasPermission, type AuthorizationContext } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { auditEvent, branch, businessSettings, creditPayment, creditSale, customer, customerCreditLimit, etimsSubmission, invoice, invoiceCreditNote, invoiceItem, invoiceNumberSequence, invoicePayment, organization, sale } from '@/lib/db/schema'
import { calculateInvoiceTotals, money, paymentStatus } from '@/lib/finance/money'
import { PermissionEnum } from '@/lib/types/permissions'

const lineSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative().finite(),
  discountAmount: z.number().nonnegative().finite().default(0),
  sku: z.string().trim().max(80).optional(),
  unit: z.string().trim().min(1).max(30).default('each'),
})
const createSchema = z.object({
  customerId: z.string().trim().optional(), branchId: z.string().trim().optional(), saleId: z.string().trim().optional(), creditSaleId: z.string().trim().optional(),
  items: z.array(lineSchema).min(1).max(500), discountAmount: z.number().nonnegative().finite().default(0), notes: z.string().trim().max(2000).optional(), dueDate: z.coerce.date().optional(), idempotencyKey: z.string().trim().min(8).max(120),
})
const paymentSchema = z.object({
  invoiceId: z.string().min(1), amount: z.number().positive().finite(), method: z.enum(['cash', 'mpesa', 'card', 'bank_transfer', 'other']), reference: z.string().trim().max(120).optional(), idempotencyKey: z.string().trim().min(8).max(120),
})
const creditNoteSchema = z.object({ invoiceId: z.string().min(1), amount: z.number().positive().finite(), reason: z.string().trim().min(3).max(500), idempotencyKey: z.string().trim().min(8).max(120) })

async function authorize(permission: PermissionEnum) {
  const context = await getAuthorizationContext()
  if (!hasPermission(context, permission)) throw new Error('You do not have permission to perform this invoice action.')
  return context
}

async function resolveBranch(context: AuthorizationContext, requested?: string) {
  if (requested && !context.isOrganizationWide && !context.branchIds.includes(requested)) throw new Error('You do not have access to this branch.')
  const condition = requested
    ? eq(branch.id, requested)
    : context.isOrganizationWide
      ? undefined
      : inArray(branch.id, context.branchIds)
  const candidates = await db.select({ id: branch.id, isMain: branch.isMain }).from(branch)
    .where(and(eq(branch.organizationId, context.organizationId), condition))
    .orderBy(desc(branch.isMain)).limit(1)
  if (!candidates[0]) throw new Error('Select an authorized branch before creating the invoice.')
  return candidates[0].id
}

function localYear(timezone: string, now = new Date()) {
  return Number(new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric' }).format(now))
}

function refreshFinance() {
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard/receivables')
  revalidatePath('/dashboard/financials')
  revalidatePath('/dashboard/reports')
}

export async function createInvoice(input: z.input<typeof createSchema>) {
  const context = await authorize(PermissionEnum.INVOICE_CREATE)
  const data = createSchema.parse(input)
  const branchId = await resolveBranch(context, data.branchId)
  const [settings, org] = await Promise.all([
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, context.organizationId)).limit(1).then((rows) => rows[0]),
    db.select().from(organization).where(eq(organization.id, context.organizationId)).limit(1).then((rows) => rows[0]),
  ])
  if (!org) throw new Error('Organization not found.')

  const linkedCredit = data.creditSaleId
    ? await db.select().from(creditSale).where(and(eq(creditSale.id, data.creditSaleId), eq(creditSale.orgId, context.organizationId))).limit(1).then((rows) => rows[0])
    : undefined
  if (data.creditSaleId && !linkedCredit) throw new Error('Credit sale not found.')
  if (data.saleId && linkedCredit && linkedCredit.saleId !== data.saleId) throw new Error('Credit sale does not belong to the selected sale.')

  const saleId = data.saleId ?? linkedCredit?.saleId
  const linkedSale = saleId
    ? await db.select({ branchId: sale.branchId, customerId: sale.customerId }).from(sale).where(and(eq(sale.id, saleId), eq(sale.orgId, context.organizationId))).limit(1).then((rows) => rows[0])
    : undefined
  if (saleId && !linkedSale) throw new Error('Linked sale was not found.')
  if (linkedSale?.branchId !== undefined && linkedSale.branchId !== branchId) throw new Error('Sale is not available in this branch.')

  const customerId = data.customerId ?? linkedCredit?.customerId ?? linkedSale?.customerId ?? undefined
  if (data.customerId && linkedCredit && linkedCredit.customerId !== data.customerId) throw new Error('Credit sale customer does not match the invoice customer.')
  if (data.customerId && linkedSale?.customerId && linkedSale.customerId !== data.customerId) throw new Error('Sale customer does not match the invoice customer.')
  const selectedCustomer = customerId
    ? await db.select().from(customer).where(and(eq(customer.id, customerId), eq(customer.orgId, context.organizationId))).limit(1).then((rows) => rows[0])
    : undefined
  if (customerId && !selectedCustomer) throw new Error('Customer is not available in this organization.')

  const policy = { enabled: settings?.taxEnabled ?? false, ratePercent: Number(settings?.taxRate ?? 0), pricesIncludeTax: settings?.pricesIncludeTax ?? false }
  const totals = calculateInvoiceTotals(data.items, data.discountAmount, policy)
  if (linkedCredit && !money(linkedCredit.amount).equals(totals.total)) throw new Error('Invoice total must exactly match the linked customer credit balance.')
  const paidAtCreation = money(linkedCredit?.amountPaid ?? 0)
  if (paidAtCreation.plus(linkedCredit?.creditedAmount ?? 0).greaterThan(totals.total)) throw new Error('Linked customer payments and credits exceed the invoice total.')
  const year = localYear(org.timezone || 'UTC')

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${context.organizationId}:invoice:create:${data.idempotencyKey}`}, 0))`)
    const [existing] = await tx.select().from(invoice).where(and(eq(invoice.orgId, context.organizationId), eq(invoice.idempotencyKey, data.idempotencyKey))).limit(1)
    if (existing) return { record: existing, duplicate: true }

    const [sequence] = await tx.insert(invoiceNumberSequence)
      .values({ organizationId: context.organizationId, year, lastNumber: 1 })
      .onConflictDoUpdate({ target: [invoiceNumberSequence.organizationId, invoiceNumberSequence.year], set: { lastNumber: sql`${invoiceNumberSequence.lastNumber} + 1`, updatedAt: new Date() } })
      .returning({ lastNumber: invoiceNumberSequence.lastNumber })
    const invoiceNo = `INV-${year}-${String(sequence.lastNumber).padStart(6, '0')}`
    const invoiceId = nanoid()
    const [record] = await tx.insert(invoice).values({
      id: invoiceId, invoiceNo, branchId, saleId, creditSaleId: data.creditSaleId, customerId,
      customerSnapshot: selectedCustomer ? { name: selectedCustomer.name, phone: selectedCustomer.phone, email: selectedCustomer.email, address: selectedCustomer.address, kraPin: selectedCustomer.kraPin } : {},
      businessSnapshot: { name: settings?.receiptBusinessName || settings?.displayName || org.name, address: settings?.receiptAddress || settings?.address, phone: settings?.receiptPhone || org.phone, email: org.businessEmail, kraPin: settings?.taxIdentifier, logoUrl: settings?.receiptLogoUrl, taxName: settings?.taxName || 'Tax' },
      subtotal: totals.subtotal.toFixed(2), discountAmount: totals.lineDiscount.plus(totals.discountAmount).toFixed(2), shippingAmount: '0', roundingAmount: '0', taxableAmount: totals.taxableAmount.toFixed(2), taxRate: String(policy.ratePercent), taxAmount: totals.taxAmount.toFixed(2), total: totals.total.toFixed(2), amountPaid: paidAtCreation.toFixed(2), creditedAmount: linkedCredit?.creditedAmount ?? '0', balanceDue: totals.total.minus(paidAtCreation).minus(linkedCredit?.creditedAmount ?? 0).toFixed(2),
      dueDate: data.dueDate ?? linkedCredit?.dueDate, status: 'draft', fiscalStatus: 'not_submitted', idempotencyKey: data.idempotencyKey, notes: data.notes, userId: context.userId, orgId: context.organizationId,
    }).returning()
    await tx.insert(invoiceItem).values(totals.lines.map((line) => ({
      id: nanoid(), invoiceId, description: line.description, quantity: line.quantity, unitPrice: money(line.unitPrice).toFixed(2), sku: line.sku, unit: line.unit, discountAmount: line.discount.toFixed(2), invoiceDiscountShare: line.invoiceDiscountShare.toFixed(2), taxRate: String(policy.ratePercent), taxAmount: line.tax.toFixed(2), total: line.total.toFixed(2), orgId: context.organizationId,
    })))
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: 'invoice.created', metadata: { invoiceId, invoiceNo, branchId, customerId, saleId, creditSaleId: data.creditSaleId, total: totals.total.toFixed(2) } })
    return { record, duplicate: false }
  })
  refreshFinance()
  return { success: true, invoice: outcome.record, duplicate: outcome.duplicate }
}

export async function issueInvoice(invoiceId: string) {
  const context = await authorize(PermissionEnum.INVOICE_ISSUE)
  const record = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(invoice).where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, context.organizationId))).limit(1).for('update')
    if (!current) throw new Error('Invoice not found.')
    if (!context.isOrganizationWide && (!current.branchId || !context.branchIds.includes(current.branchId))) throw new Error('You do not have access to this invoice.')
    if (current.status !== 'draft') throw new Error('Only a draft invoice can be issued.')
    const next = paymentStatus(new Decimal(current.total).minus(current.creditedAmount), current.amountPaid, current.dueDate)
    const [updated] = await tx.update(invoice).set({ status: next.status, balanceDue: next.balance.toFixed(2), issuedAt: new Date(), updatedAt: new Date() }).where(and(eq(invoice.id, invoiceId), eq(invoice.status, 'draft'))).returning()
    if (!updated) throw new Error('Invoice was already issued by another user.')
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: 'invoice.issued', metadata: { invoiceId, invoiceNo: current.invoiceNo, branchId: current.branchId, beforeStatus: current.status, afterStatus: updated.status } })
    return updated
  })
  refreshFinance()
  return { success: true, invoice: record }
}

export async function recordInvoicePayment(input: z.input<typeof paymentSchema>) {
  const context = await authorize(PermissionEnum.INVOICE_RECORD_PAYMENT)
  const data = paymentSchema.parse(input)
  const paymentAmount = money(data.amount)
  if (!paymentAmount.greaterThan(0)) throw new Error('Payment amount is too small.')
  if (data.method !== 'cash' && !data.reference) throw new Error('Enter the payment provider or bank reference.')

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${context.organizationId}:invoice:payment:${data.idempotencyKey}`}, 0))`)
    const [prior] = await tx.select().from(invoicePayment).where(and(eq(invoicePayment.organizationId, context.organizationId), eq(invoicePayment.idempotencyKey, data.idempotencyKey))).limit(1)
    if (prior) return { payment: prior, duplicate: true }
    const [current] = await tx.select().from(invoice).where(and(eq(invoice.id, data.invoiceId), eq(invoice.orgId, context.organizationId))).limit(1).for('update')
    if (!current) throw new Error('Invoice not found.')
    if (!context.isOrganizationWide && (!current.branchId || !context.branchIds.includes(current.branchId))) throw new Error('You do not have access to this invoice.')
    if (!['issued', 'partially_paid', 'overdue'].includes(current.status)) throw new Error(current.status === 'paid' ? 'Invoice has already been paid.' : 'Payments can only be recorded against an issued invoice.')
    const balance = money(current.balanceDue)
    if (paymentAmount.greaterThan(balance)) throw new Error('Payment exceeds the outstanding balance.')

    const paymentId = nanoid()
    const [payment] = await tx.insert(invoicePayment).values({ id: paymentId, invoiceId: current.id, organizationId: context.organizationId, branchId: current.branchId, amount: paymentAmount.toFixed(2), method: data.method, reference: data.reference, idempotencyKey: data.idempotencyKey, receivedBy: context.userId }).returning()
    const paid = money(new Decimal(current.amountPaid).plus(paymentAmount))
    const state = paymentStatus(new Decimal(current.total).minus(current.creditedAmount), paid, current.dueDate)
    await tx.update(invoice).set({ amountPaid: paid.toFixed(2), balanceDue: state.balance.toFixed(2), status: state.status, updatedAt: new Date() }).where(eq(invoice.id, current.id))

    if (current.creditSaleId) {
      const [credit] = await tx.select().from(creditSale).where(and(eq(creditSale.id, current.creditSaleId), eq(creditSale.orgId, context.organizationId))).limit(1).for('update')
      if (!credit) throw new Error('Linked customer credit record is missing.')
      const creditPaid = money(new Decimal(credit.amountPaid).plus(paymentAmount))
      if (creditPaid.greaterThan(money(new Decimal(credit.amount).minus(credit.creditedAmount)))) throw new Error('Payment exceeds the linked customer balance.')
      await tx.insert(creditPayment).values({ id: nanoid(), creditSaleId: credit.id, amount: paymentAmount.toFixed(2), method: data.method, reference: data.reference, idempotencyKey: `invoice:${data.idempotencyKey}`, userId: context.userId, orgId: context.organizationId })
      const creditSettled = creditPaid.plus(credit.creditedAmount).greaterThanOrEqualTo(money(credit.amount))
      await tx.update(creditSale).set({ amountPaid: creditPaid.toFixed(2), status: creditSettled ? Number(credit.creditedAmount) > 0 ? 'credited' : 'paid' : 'partially_paid', updatedAt: new Date() }).where(eq(creditSale.id, credit.id))
      const [limit] = await tx.select().from(customerCreditLimit).where(and(eq(customerCreditLimit.customerId, credit.customerId), eq(customerCreditLimit.orgId, context.organizationId))).limit(1).for('update')
      if (limit) await tx.update(customerCreditLimit).set({ currentBalance: money(Decimal.max(0, new Decimal(limit.currentBalance).minus(paymentAmount))).toFixed(2), updatedAt: new Date() }).where(eq(customerCreditLimit.id, limit.id))
    }
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: 'invoice.payment_recorded', metadata: { invoiceId: current.id, invoiceNo: current.invoiceNo, paymentId, amount: paymentAmount.toFixed(2), method: data.method, reference: data.reference, beforeBalance: current.balanceDue, afterBalance: state.balance.toFixed(2), branchId: current.branchId } })
    return { payment, duplicate: false }
  })
  refreshFinance()
  return { success: true, payment: outcome.payment, duplicate: outcome.duplicate }
}

export async function cancelInvoice(invoiceId: string, reason: string) {
  const context = await authorize(PermissionEnum.INVOICE_CANCEL)
  if (reason.trim().length < 3) throw new Error('Enter a cancellation reason.')
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(invoice).where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, context.organizationId))).limit(1).for('update')
    if (!current) throw new Error('Invoice not found.')
    if (!context.isOrganizationWide && (!current.branchId || !context.branchIds.includes(current.branchId))) throw new Error('You do not have access to this invoice.')
    if (Number(current.amountPaid) > 0) throw new Error('A paid invoice must be reversed with a credit note or refund.')
    if (!['draft', 'issued', 'overdue'].includes(current.status)) throw new Error('This invoice cannot be cancelled.')
    if (['submitted', 'accepted'].includes(current.fiscalStatus)) throw new Error('A fiscal invoice must be reversed through the eTIMS credit-note workflow.')
    await tx.update(invoice).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(invoice.id, current.id))
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: 'invoice.cancelled', metadata: { invoiceId, invoiceNo: current.invoiceNo, branchId: current.branchId, beforeStatus: current.status, reason: reason.trim() } })
  })
  refreshFinance()
  return { success: true }
}

export async function issueInvoiceCreditNote(input: z.input<typeof creditNoteSchema>) {
  const data = creditNoteSchema.parse(input)
  const context = await authorize(PermissionEnum.INVOICE_CREDIT_NOTE)
  const creditAmount = money(data.amount)
  if (!creditAmount.greaterThan(0)) throw new Error('Credit-note amount is too small.')
  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${context.organizationId}:invoice-credit:${data.idempotencyKey}`}, 0))`)
    const [existing] = await tx.select().from(invoiceCreditNote).where(and(eq(invoiceCreditNote.organizationId, context.organizationId), eq(invoiceCreditNote.idempotencyKey, data.idempotencyKey))).limit(1)
    if (existing) return { note: existing, duplicate: true }
    const [current] = await tx.select().from(invoice).where(and(eq(invoice.id, data.invoiceId), eq(invoice.orgId, context.organizationId))).limit(1).for('update')
    if (!current) throw new Error('Invoice not found.')
    if (!context.isOrganizationWide && (!current.branchId || !context.branchIds.includes(current.branchId))) throw new Error('You do not have access to this invoice.')
    if (current.saleId) throw new Error('Use the sale refund workflow so inventory, receivables and eTIMS remain synchronized.')
    if (!['issued', 'partially_paid', 'overdue'].includes(current.status)) throw new Error('Only an open issued invoice can receive a credit note.')
    if (['submitted', 'accepted'].includes(current.fiscalStatus)) throw new Error('Use the eTIMS credit-note workflow for this fiscal invoice.')
    const outstanding = money(current.balanceDue)
    if (creditAmount.greaterThan(outstanding)) throw new Error('Credit note exceeds the outstanding invoice balance.')
    const [{ count }] = await tx.select({ count: sql<number>`count(*)` }).from(invoiceCreditNote).where(eq(invoiceCreditNote.invoiceId, current.id))
    const creditNoteNo = `CN-${current.invoiceNo}-${String(Number(count) + 1).padStart(2, '0')}`
    const noteId = nanoid()
    const [note] = await tx.insert(invoiceCreditNote).values({ id: noteId, organizationId: context.organizationId, branchId: current.branchId, invoiceId: current.id, creditNoteNo, amount: creditAmount.toFixed(2), reason: data.reason, idempotencyKey: data.idempotencyKey, createdBy: context.userId }).returning()
    const credited = money(new Decimal(current.creditedAmount).plus(creditAmount))
    const effectiveTotal = money(new Decimal(current.total).minus(credited))
    const state = paymentStatus(effectiveTotal, current.amountPaid, current.dueDate)
    const status = state.balance.isZero() ? 'credited' : state.status
    await tx.update(invoice).set({ creditedAmount: credited.toFixed(2), balanceDue: state.balance.toFixed(2), status, updatedAt: new Date() }).where(eq(invoice.id, current.id))
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: 'invoice.credit_note_issued', metadata: { invoiceId: current.id, invoiceNo: current.invoiceNo, creditNoteId: noteId, creditNoteNo, amount: creditAmount.toFixed(2), reason: data.reason, beforeBalance: current.balanceDue, afterBalance: state.balance.toFixed(2), branchId: current.branchId } })
    return { note, duplicate: false }
  })
  refreshFinance()
  return { success: true, creditNote: outcome.note, duplicate: outcome.duplicate }
}

export async function deleteInvoice(invoiceId: string) {
  const context = await authorize(PermissionEnum.INVOICE_CANCEL)
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(invoice).where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, context.organizationId))).limit(1).for('update')
    if (!current) throw new Error('Invoice not found.')
    if (!context.isOrganizationWide && (!current.branchId || !context.branchIds.includes(current.branchId))) throw new Error('You do not have access to this invoice.')
    if (current.status !== 'draft' || Number(current.amountPaid) > 0) throw new Error('Only an unpaid draft invoice can be deleted.')
    await tx.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: 'invoice.draft_deleted', metadata: { invoiceId, invoiceNo: current.invoiceNo, branchId: current.branchId } })
    await tx.delete(invoice).where(eq(invoice.id, current.id))
  })
  refreshFinance()
  return { success: true }
}

export async function getInvoiceWithItems(invoiceId: string) {
  const context = await authorize(PermissionEnum.INVOICE_VIEW)
  const branchScope = context.isOrganizationWide ? undefined : inArray(invoice.branchId, context.branchIds)
  const [record] = await db.select().from(invoice).where(and(eq(invoice.id, invoiceId), eq(invoice.orgId, context.organizationId), branchScope)).limit(1)
  if (!record) throw new Error('Invoice not found.')
  const [items, payments, creditNotes, fiscal] = await Promise.all([
    db.select().from(invoiceItem).where(and(eq(invoiceItem.invoiceId, invoiceId), eq(invoiceItem.orgId, context.organizationId))),
    db.select().from(invoicePayment).where(and(eq(invoicePayment.invoiceId, invoiceId), eq(invoicePayment.organizationId, context.organizationId))).orderBy(desc(invoicePayment.createdAt)),
    db.select().from(invoiceCreditNote).where(and(eq(invoiceCreditNote.invoiceId, invoiceId), eq(invoiceCreditNote.organizationId, context.organizationId))).orderBy(desc(invoiceCreditNote.createdAt)),
    record.saleId ? db.select({ status: etimsSubmission.status, invoiceNumber: etimsSubmission.invoiceNumber, receiptNumber: etimsSubmission.receiptNumber, controlNumber: etimsSubmission.controlNumber, qrData: etimsSubmission.qrData, verificationData: etimsSubmission.verificationData }).from(etimsSubmission).where(and(eq(etimsSubmission.saleId, record.saleId), eq(etimsSubmission.organizationId, context.organizationId))).limit(1).then((rows) => rows[0] ?? null) : Promise.resolve(null),
  ])
  return { invoice: record, items, payments, creditNotes, fiscal }
}
