'use server'

import Decimal from 'decimal.js'
import { and, eq, gte, inArray, lt, notInArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branchMembership, employee, organizationMembership, sale, salesReturn, user } from '@/lib/db/schema'
import { getAuthorizationContext } from '@/lib/auth/authorization'

const PAID_SALE_STATUSES = ['completed', 'partially_refunded', 'refunded']

function asNumber(value: unknown) {
  const parsed = new Decimal(String(value ?? 0)).toNumber()
  return Number.isFinite(parsed) ? parsed : 0
}

function safeTimeZone(value: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return value } catch { return 'Africa/Nairobi' }
}

function localDateParts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((value) => value.type === type)?.value ?? 0)
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') }
}

function zonedMidnight(year: number, month: number, day: number, timeZone: string) {
  const desired = Date.UTC(year, month - 1, day)
  let candidate = desired
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = localDateParts(new Date(candidate), timeZone)
    const actualValue = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second)
    candidate += desired - actualValue
  }
  return new Date(candidate)
}

/** Tenant-scoped, refund-aware source of truth for the Staff Performance page. */
export async function getStaffPerformanceData(timeZone = 'Africa/Nairobi') {
  const authorization = await getAuthorizationContext()
  const orgId = authorization.organizationId
  const zone = safeTimeZone(timeZone)
  const current = localDateParts(new Date(), zone)
  const tomorrow = new Date(Date.UTC(current.year, current.month - 1, current.day + 1))
  const from = zonedMidnight(current.year, current.month, current.day, zone)
  const toExclusive = zonedMidnight(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth() + 1, tomorrow.getUTCDate(), zone)
  const branchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length ? inArray(sale.branchId, authorization.branchIds) : sql`false`
  const paidSaleScope = and(eq(sale.orgId, orgId), inArray(sale.status, PAID_SALE_STATUSES), branchScope)
  const todayPaidSaleScope = and(paidSaleScope, gte(sale.createdAt, from), lt(sale.createdAt, toExclusive))
  const localSaleHour = sql<number>`extract(hour from ((${sale.createdAt} at time zone 'UTC') at time zone ${zone}))`

  const [salesByStaff, refundsByStaff, salesByHour, refundsByHour, activeTodayRows, members, employees] = await Promise.all([
    db.select({
      staffId: sale.userId,
      staffName: user.name,
      grossSales: sql<string>`coalesce(sum(${sale.total}), 0)`,
      transactionCount: sql<number>`count(*)`,
    }).from(sale).leftJoin(user, eq(user.id, sale.userId)).where(paidSaleScope).groupBy(sale.userId, user.name),
    db.select({
      staffId: sale.userId,
      refunds: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`,
    }).from(salesReturn).innerJoin(sale, eq(sale.id, salesReturn.saleId)).where(and(paidSaleScope, eq(salesReturn.status, 'completed'))).groupBy(sale.userId),
    db.select({
      hour: localSaleHour,
      staffCount: sql<number>`count(distinct ${sale.userId})`,
      grossSales: sql<string>`coalesce(sum(${sale.total}), 0)`,
      transactionCount: sql<number>`count(*)`,
    }).from(sale).where(paidSaleScope).groupBy(sql`1`),
    db.select({
      hour: localSaleHour,
      refunds: sql<string>`coalesce(sum(${salesReturn.amount}), 0)`,
    }).from(salesReturn).innerJoin(sale, eq(sale.id, salesReturn.saleId)).where(and(paidSaleScope, eq(salesReturn.status, 'completed'))).groupBy(sql`1`),
    db.selectDistinct({ staffId: sale.userId }).from(sale).where(todayPaidSaleScope),
    authorization.isOrganizationWide
      ? db.select({ id: organizationMembership.userId }).from(organizationMembership).innerJoin(user, eq(user.id, organizationMembership.userId)).where(and(eq(organizationMembership.organizationId, orgId), eq(user.status, 'active')))
      : db.selectDistinct({ id: branchMembership.userId }).from(branchMembership).innerJoin(user, eq(user.id, branchMembership.userId)).where(and(inArray(branchMembership.branchId, authorization.branchIds), eq(user.status, 'active'))),
    authorization.isOrganizationWide
      ? db.select({ id: employee.id, userId: employee.userId }).from(employee).where(and(eq(employee.orgId, orgId), notInArray(employee.status, ['terminated'])))
      : db.selectDistinct({ id: employee.id, userId: employee.userId }).from(employee).innerJoin(branchMembership, eq(branchMembership.userId, employee.userId)).where(and(eq(employee.orgId, orgId), notInArray(employee.status, ['terminated']), inArray(branchMembership.branchId, authorization.branchIds))),
  ])

  const refundByStaff = new Map(refundsByStaff.map((row) => [row.staffId, asNumber(row.refunds)]))
  const allStaff = salesByStaff.map((row) => {
    const totalSales = Math.max(0, asNumber(row.grossSales) - (refundByStaff.get(row.staffId) ?? 0))
    const transactions = Number(row.transactionCount ?? 0)
    return { id: row.staffId, name: row.staffName || 'Unknown staff member', totalSales, transactions, avgValue: transactions ? totalSales / transactions : 0 }
  }).sort((left, right) => right.totalSales - left.totalSales)

  const roster = new Set(members.map((member) => `user:${member.id}`))
  for (const record of employees) roster.add(record.userId ? `user:${record.userId}` : `employee:${record.id}`)

  const refundByHour = new Map(refundsByHour.map((row) => [Number(row.hour), asNumber(row.refunds)]))
  const hourlyRows = new Map(salesByHour.map((row) => [Number(row.hour), row]))
  const performanceTrend = Array.from({ length: 24 }, (_, hour) => {
    const row = hourlyRows.get(hour)
    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      activeStaff: Number(row?.staffCount ?? 0),
      sales: Math.max(0, asNumber(row?.grossSales) - (refundByHour.get(hour) ?? 0)),
      transactions: Number(row?.transactionCount ?? 0),
    }
  })
  const totalSalesValue = allStaff.reduce((sum, member) => sum + member.totalSales, 0)
  const totalTransactions = allStaff.reduce((sum, member) => sum + member.transactions, 0)
  const activeStaff = activeTodayRows.length

  return {
    topStaff: allStaff.slice(0, 10),
    staffMetrics: {
      totalStaff: roster.size,
      activeStaff,
      totalSalesValue,
      totalTransactions,
      avgPerStaff: allStaff.length ? totalSalesValue / allStaff.length : 0,
    },
    performanceTrend,
  }
}
