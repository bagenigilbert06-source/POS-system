'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { OrganizationService } from '@/lib/services/organization-service'
import { sale, user, branchMembership } from '@/lib/db/schema'
import { and, eq, gte, lte, sum as dbSum, desc, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'

// Helper to get current user's organization
async function getUserOrganization() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) throw new Error('No organization found')
  return organization
}

// ===== STAFF PERFORMANCE DASHBOARD =====
export async function getStaffPerformanceData(dateFrom: Date, dateTo: Date) {
  const org = await getUserOrganization()
  
  const [topStaff, staffMetrics, performanceTrend] = await Promise.all([
    // Top performing staff
    db
      .select({
        staffId: sale.userId,
        staffName: user.name,
        totalSales: dbSum(sale.total),
        transactionCount: dbSum(sql`1`),
        avgTransactionValue: sql`AVG(${sale.total})`,
      })
      .from(sale)
      .innerJoin(user, eq(sale.userId, user.id))
      .where(and(
        eq(sale.orgId, org.id),
        gte(sale.createdAt, dateFrom),
        lte(sale.createdAt, dateTo)
      ))
      .groupBy(sale.userId)
      .orderBy(desc(dbSum(sale.total)))
      .limit(10)
      .then(rows => rows.map(r => ({
        id: r.staffId,
        name: r.staffName || 'Unknown',
        totalSales: new Decimal(r.totalSales || 0).toNumber(),
        transactions: Number(r.transactionCount || 0),
        avgValue: new Decimal(r.avgTransactionValue || 0).toNumber()
      }))),
    
    // Staff count and metrics
    db
      .select({
        totalStaff: sql`COUNT(DISTINCT ${user.id})`,
        activeToday: sql`COUNT(DISTINCT ${sale.userId})`,
        totalSales: dbSum(sale.total),
        totalTransactions: dbSum(sql`1`),
      })
      .from(user)
      .leftJoin(sale, and(
        eq(user.id, sale.userId),
        gte(sale.createdAt, dateFrom),
        lte(sale.createdAt, dateTo)
      ))
      .then(rows => ({
        totalStaff: Number(rows[0]?.totalStaff || 0),
        activeStaff: Number(rows[0]?.activeToday || 0),
        totalSalesValue: new Decimal(rows[0]?.totalSales || 0).toNumber(),
        totalTransactions: Number(rows[0]?.totalTransactions || 0),
        avgPerStaff: new Decimal(rows[0]?.totalSales || 0).dividedBy(Math.max(1, Number(rows[0]?.activeToday || 1))).toNumber()
      })),
    
    // Performance trend (hourly)
    db
      .select({
        hour: sql`EXTRACT(HOUR FROM ${sale.createdAt})`,
        staffCount: sql`COUNT(DISTINCT ${sale.userId})`,
        totalSales: dbSum(sale.total),
        transactionCount: dbSum(sql`1`),
      })
      .from(sale)
      .where(and(
        eq(sale.orgId, org.id),
        gte(sale.createdAt, dateFrom),
        lte(sale.createdAt, dateTo)
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${sale.createdAt})`)
      .then(rows => rows.map(r => ({
        hour: String(r.hour || 0).padStart(2, '0') + ':00',
        activeStaff: Number(r.staffCount || 0),
        sales: new Decimal(r.totalSales || 0).toNumber(),
        transactions: Number(r.transactionCount || 0)
      })))
  ])

  return {
    topStaff,
    staffMetrics,
    performanceTrend
  }
}
