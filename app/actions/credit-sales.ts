'use server'

import Decimal from 'decimal.js'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { requireAnyPermission, requirePermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { auditEvent, creditPayment, creditSale, customer, customerCreditLimit, invoice, sale } from '@/lib/db/schema'
import { money } from '@/lib/finance/money'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'

const createSchema = z.object({ saleId: z.string().min(1), customerId: z.string().min(1), amount: z.number().positive().finite(), dueDate: z.coerce.date().optional() })
const paymentSchema = z.object({ creditSaleId: z.string().min(1), amount: z.number().positive().finite(), method: z.enum(['cash', 'mpesa', 'card', 'bank_transfer', 'other']), reference: z.string().trim().max(120).optional(), idempotencyKey: z.string().trim().min(8).max(120) })
const limitSchema = z.object({ customerId: z.string().min(1), creditLimit: z.number().nonnegative().finite() })

export async function createCreditSale(input: z.input<typeof createSchema>) {
  const data = createSchema.parse(input)
  const context = await requireAnyPermission([PermissionEnum.RECEIVABLE_MANAGE, PermissionEnum.POS_SELL])
  const result = await db.transaction(async (tx) => {
    const [saleRecord] = await tx.select().from(sale).where(and(eq(sale.id, data.saleId), eq(sale.orgId, context.organizationId))).limit(1).for('update')
    if (!saleRecord) throw new Error('Sale not found.')
    if (!saleRecord.branchId || (!context.isOrganizationWide && !context.branchIds.includes(saleRecord.branchId))) throw new Error('You do not have access to this sale branch.')
    if (saleRecord.status !== 'completed' || saleRecord.paymentMethod !== 'credit') throw new Error('Only a completed customer-credit sale can create a receivable.')
    if (saleRecord.customerId !== data.customerId) throw new Error('The selected customer does not match the sale.')
    const authoritativeAmount = money(saleRecord.total)
    if (!authoritativeAmount.equals(money(data.amount))) throw new Error('Credit amount does not match the authoritative sale total.')
    const [existing] = await tx.select().from(creditSale).where(eq(creditSale.saleId, saleRecord.id)).limit(1)
    if (existing) return { creditSaleId: existing.id, duplicate: true }
    const [limit] = await tx.select().from(customerCreditLimit).where(and(eq(customerCreditLimit.customerId, data.customerId), eq(customerCreditLimit.orgId, context.organizationId), eq(customerCreditLimit.status, 'active'))).limit(1).for('update')
    if (!limit) throw new Error('Configure an active credit limit for this customer first.')
    const newBalance = money(new Decimal(limit.currentBalance).plus(authoritativeAmount))
    if (newBalance.greaterThan(money(limit.creditLimit))) throw new Error('Credit limit exceeded for this customer.')
    const creditSaleId = generateId()
    await tx.insert(creditSale).values({ id: creditSaleId, saleId: saleRecord.id, customerId: data.customerId, amount: authoritativeAmount.toFixed(2), amountPaid: '0', dueDate: data.dueDate, status: 'unpaid', userId: context.userId, orgId: context.organizationId })
    await tx.update(customerCreditLimit).set({ currentBalance: newBalance.toFixed(2), updatedAt: new Date() }).where(eq(customerCreditLimit.id, limit.id))
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: context.organizationId, userId: context.userId, action: 'credit_sale_created', metadata: { creditSaleId, saleId: saleRecord.id, customerId: data.customerId, branchId: saleRecord.branchId, amount: authoritativeAmount.toFixed(2), dueDate: data.dueDate?.toISOString() } })
    return { creditSaleId, duplicate: false }
  })
  return { ...result, status: 'success' as const }
}

export async function recordCreditPayment(input: z.input<typeof paymentSchema>) {
  const data = paymentSchema.parse(input)
  const context = await requirePermission(PermissionEnum.RECEIVABLE_MANAGE)
  const paymentAmount = money(data.amount)
  if (!paymentAmount.greaterThan(0)) throw new Error('Payment amount is too small.')
  if (data.method !== 'cash' && !data.reference) throw new Error('Enter the payment provider or bank reference.')
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${context.organizationId}:credit-payment:${data.idempotencyKey}`}, 0))`)
    const [existingPayment] = await tx.select().from(creditPayment).where(and(eq(creditPayment.orgId, context.organizationId), eq(creditPayment.idempotencyKey, data.idempotencyKey))).limit(1)
    if (existingPayment) return { paymentId: existingPayment.id, fullyPaid: false, duplicate: true }
    const [credit] = await tx.select({ record: creditSale, branchId: sale.branchId }).from(creditSale).innerJoin(sale, eq(sale.id, creditSale.saleId)).where(and(eq(creditSale.id, data.creditSaleId), eq(creditSale.orgId, context.organizationId))).limit(1).for('update')
    if (!credit) throw new Error('Credit sale not found.')
    if (!credit.branchId || (!context.isOrganizationWide && !context.branchIds.includes(credit.branchId))) throw new Error('You do not have access to this receivable.')
    const [linkedInvoice] = await tx.select({ id: invoice.id }).from(invoice).where(and(eq(invoice.creditSaleId, credit.record.id), eq(invoice.orgId, context.organizationId))).limit(1)
    if (linkedInvoice) throw new Error('Record this collection from the linked invoice so both balances stay synchronized.')
    const outstanding = money(new Decimal(credit.record.amount).minus(credit.record.amountPaid).minus(credit.record.creditedAmount))
    if (!outstanding.greaterThan(0)) throw new Error('This customer balance is already settled.')
    if (paymentAmount.greaterThan(outstanding)) throw new Error('Payment exceeds the outstanding customer balance.')
    const newAmountPaid = money(new Decimal(credit.record.amountPaid).plus(paymentAmount))
    const fullyPaid = newAmountPaid.plus(credit.record.creditedAmount).greaterThanOrEqualTo(money(credit.record.amount))
    const paymentId = generateId()
    await tx.insert(creditPayment).values({ id: paymentId, creditSaleId: credit.record.id, amount: paymentAmount.toFixed(2), method: data.method, reference: data.reference, idempotencyKey: data.idempotencyKey, userId: context.userId, orgId: context.organizationId })
    await tx.update(creditSale).set({ amountPaid: newAmountPaid.toFixed(2), status: fullyPaid ? Number(credit.record.creditedAmount) > 0 ? 'credited' : 'paid' : 'partially_paid', updatedAt: new Date() }).where(eq(creditSale.id, credit.record.id))
    const [limit] = await tx.select().from(customerCreditLimit).where(and(eq(customerCreditLimit.customerId, credit.record.customerId), eq(customerCreditLimit.orgId, context.organizationId))).limit(1).for('update')
    if (limit) await tx.update(customerCreditLimit).set({ currentBalance: money(Decimal.max(0, new Decimal(limit.currentBalance).minus(paymentAmount))).toFixed(2), updatedAt: new Date() }).where(eq(customerCreditLimit.id, limit.id))
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: context.organizationId, userId: context.userId, action: 'credit_payment_recorded', metadata: { paymentId, creditSaleId: credit.record.id, customerId: credit.record.customerId, branchId: credit.branchId, amount: paymentAmount.toFixed(2), method: data.method, reference: data.reference, beforeBalance: outstanding.toFixed(2), afterBalance: outstanding.minus(paymentAmount).toFixed(2), fullyPaid } })
    return { paymentId, fullyPaid, duplicate: false }
  })
  return { ...result, status: 'success' as const }
}

export async function setCustomerCreditLimit(input: z.input<typeof limitSchema>) {
  const data = limitSchema.parse(input)
  const context = await requirePermission(PermissionEnum.RECEIVABLE_MANAGE)
  const requestedLimit = money(data.creditLimit)
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${context.organizationId}:credit-limit:${data.customerId}`}, 0))`)
    const [customerRecord] = await tx.select({ id: customer.id }).from(customer).where(and(eq(customer.id, data.customerId), eq(customer.orgId, context.organizationId))).limit(1)
    if (!customerRecord) throw new Error('Customer not found.')
    const [existing] = await tx.select().from(customerCreditLimit).where(and(eq(customerCreditLimit.customerId, data.customerId), eq(customerCreditLimit.orgId, context.organizationId))).limit(1).for('update')
    if (existing && requestedLimit.lessThan(money(existing.currentBalance))) throw new Error('Credit limit cannot be below the customer’s current outstanding balance.')
    if (existing) {
      await tx.update(customerCreditLimit).set({ creditLimit: requestedLimit.toFixed(2), approvedBy: context.userId, updatedAt: new Date() }).where(eq(customerCreditLimit.id, existing.id))
    } else {
      await tx.insert(customerCreditLimit).values({ id: generateId(), customerId: data.customerId, creditLimit: requestedLimit.toFixed(2), currentBalance: '0', approvedBy: context.userId, orgId: context.organizationId })
    }
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: context.organizationId, userId: context.userId, action: 'customer_credit_limit_changed', metadata: { customerId: data.customerId, previousLimit: existing?.creditLimit ?? null, newLimit: requestedLimit.toFixed(2), currentBalance: existing?.currentBalance ?? '0' } })
  })
  return { status: 'success' as const }
}
