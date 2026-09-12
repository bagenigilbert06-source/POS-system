import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, customer, customerFeedback, sale, user } from '@/lib/db/schema'
import { npsFromCounts } from './rules'
export { npsFromCounts } from './rules'

export async function getFeedbackReport(input: { organizationId: string; branchIds?: string[]; from?: Date; to?: Date; category?: string; score?: number; tag?: string }) {
  const conditions = [eq(customerFeedback.organizationId, input.organizationId)]
  if (input.branchIds !== undefined) conditions.push(input.branchIds.length ? inArray(customerFeedback.branchId, input.branchIds) : sql`false`)
  if (input.from) conditions.push(gte(customerFeedback.submittedAt, input.from))
  if (input.to) conditions.push(lte(customerFeedback.submittedAt, input.to))
  if (input.category) conditions.push(eq(customerFeedback.category, input.category))
  if (input.score !== undefined) conditions.push(eq(customerFeedback.score, input.score))
  const where = and(...conditions)
  const [counts] = await db.select({ responses: sql<number>`count(*)`, promoters: sql<number>`count(*) filter (where ${customerFeedback.category} = 'PROMOTER')`, passives: sql<number>`count(*) filter (where ${customerFeedback.category} = 'PASSIVE')`, detractors: sql<number>`count(*) filter (where ${customerFeedback.category} = 'DETRACTOR')` }).from(customerFeedback).where(where)
  const rows = await db.select({
    id: customerFeedback.id,
    submittedAt: customerFeedback.submittedAt,
    score: customerFeedback.score,
    category: customerFeedback.category,
    tags: customerFeedback.tags,
    comment: customerFeedback.comment,
    branchName: branch.name,
    saleId: sale.id,
    receiptNo: sale.receiptNo,
    saleTotal: sale.total,
    paymentMethod: sale.paymentMethod,
    saleCreatedAt: sale.createdAt,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    cashierName: user.name,
  }).from(customerFeedback)
    .innerJoin(branch, and(eq(branch.id, customerFeedback.branchId), eq(branch.organizationId, customerFeedback.organizationId)))
    .innerJoin(sale, and(eq(sale.id, customerFeedback.saleId), eq(sale.orgId, customerFeedback.organizationId)))
    .leftJoin(customer, and(eq(customer.id, sale.customerId), eq(customer.orgId, customerFeedback.organizationId)))
    .leftJoin(user, eq(user.id, sale.userId))
    .where(where)
    .orderBy(desc(customerFeedback.submittedAt))
    .limit(100)
  const metrics = { responses: Number(counts?.responses ?? 0), promoters: Number(counts?.promoters ?? 0), passives: Number(counts?.passives ?? 0), detractors: Number(counts?.detractors ?? 0) }
  return { ...metrics, nps: npsFromCounts(metrics.promoters, metrics.detractors, metrics.responses), rows: input.tag ? rows.filter(row => Array.isArray(row.tags) && row.tags.includes(input.tag)) : rows }
}
