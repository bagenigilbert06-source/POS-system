import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, customerFeedback } from '@/lib/db/schema'
import { npsFromCounts } from './rules'
export { npsFromCounts } from './rules'

export async function getFeedbackReport(input: { organizationId: string; branchIds?: string[]; from?: Date; to?: Date; category?: string; score?: number; tag?: string }) {
  const conditions = [eq(customerFeedback.organizationId, input.organizationId)]
  if (input.branchIds?.length) conditions.push(inArray(customerFeedback.branchId, input.branchIds))
  if (input.from) conditions.push(gte(customerFeedback.submittedAt, input.from))
  if (input.to) conditions.push(lte(customerFeedback.submittedAt, input.to))
  if (input.category) conditions.push(eq(customerFeedback.category, input.category))
  if (input.score !== undefined) conditions.push(eq(customerFeedback.score, input.score))
  const where = and(...conditions)
  const [counts] = await db.select({ responses: sql<number>`count(*)`, promoters: sql<number>`count(*) filter (where ${customerFeedback.category} = 'PROMOTER')`, passives: sql<number>`count(*) filter (where ${customerFeedback.category} = 'PASSIVE')`, detractors: sql<number>`count(*) filter (where ${customerFeedback.category} = 'DETRACTOR')` }).from(customerFeedback).where(where)
  const rows = await db.select({ submittedAt: customerFeedback.submittedAt, score: customerFeedback.score, category: customerFeedback.category, tags: customerFeedback.tags, comment: customerFeedback.comment, branchName: branch.name }).from(customerFeedback).innerJoin(branch, and(eq(branch.id, customerFeedback.branchId), eq(branch.organizationId, customerFeedback.organizationId))).where(where).orderBy(desc(customerFeedback.submittedAt)).limit(100)
  const metrics = { responses: Number(counts?.responses ?? 0), promoters: Number(counts?.promoters ?? 0), passives: Number(counts?.passives ?? 0), detractors: Number(counts?.detractors ?? 0) }
  return { ...metrics, nps: npsFromCounts(metrics.promoters, metrics.detractors, metrics.responses), rows: input.tag ? rows.filter(row => Array.isArray(row.tags) && row.tags.includes(input.tag)) : rows }
}
