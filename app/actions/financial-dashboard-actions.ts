'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { OrganizationService } from '@/lib/services/organization-service'
import { sale, expense, purchase, product, creditSale } from '@/lib/db/schema'
import { and, eq, gte, lte, sum as dbSum, sql } from 'drizzle-orm'
import Decimal from 'decimal.js'

// Helper to get current user's organization
async function getUserOrganization() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) throw new Error('No organization found')
  return organization
}

// ===== FINANCIAL INSIGHTS DASHBOARD =====
export async function getFinancialInsightData(dateFrom: Date, dateTo: Date) {
  const org = await getUserOrganization()
  
  const [profitLossData, cashFlowData, creditAnalysis] = await Promise.all([
    // Profit & Loss Summary
    db.select({
      totalRevenue: dbSum(sale.total),
      totalExpenses: dbSum(expense.amount),
      totalCogs: dbSum(sql`(SELECT SUM(${product.buyingPrice} * qty) FROM (
        SELECT SUM(quantity) as qty FROM sale_item 
        WHERE sale_id IN (SELECT id FROM sale WHERE org_id = ${org.id} AND created_at >= ${dateFrom} AND created_at <= ${dateTo})
      ) subq)`),
    })
    .from(sale)
    .leftJoin(expense, eq(sale.orgId, expense.orgId))
    .where(and(
      eq(sale.orgId, org.id),
      gte(sale.createdAt, dateFrom),
      lte(sale.createdAt, dateTo)
    ))
    .then(rows => {
      const revenue = new Decimal(rows[0]?.totalRevenue || 0)
      const expenses = new Decimal(rows[0]?.totalExpenses || 0)
      const cogs = new Decimal(rows[0]?.totalCogs || 0)
      const grossProfit = revenue.minus(cogs)
      const operatingProfit = grossProfit.minus(expenses)
      const profitMargin = revenue.gt(0) ? operatingProfit.dividedBy(revenue).times(100) : new Decimal(0)
      
      return {
        revenue: revenue.toNumber(),
        cogs: cogs.toNumber(),
        grossProfit: grossProfit.toNumber(),
        expenses: expenses.toNumber(),
        operatingProfit: operatingProfit.toNumber(),
        profitMargin: profitMargin.toNumber()
      }
    }),
    
    // Cash Flow Analysis
    db.select({
      cashIn: dbSum(sql`CASE WHEN ${sale.paymentMethod} = 'cash' THEN ${sale.total} ELSE 0 END`),
      cashOut: dbSum(expense.amount),
      creditIn: dbSum(sql`CASE WHEN ${sale.paymentMethod} != 'cash' THEN ${sale.total} ELSE 0 END`),
    })
    .from(sale)
    .leftJoin(expense, eq(sale.orgId, expense.orgId))
    .where(and(
      eq(sale.orgId, org.id),
      gte(sale.createdAt, dateFrom),
      lte(sale.createdAt, dateTo)
    ))
    .then(rows => ({
      cashInflow: new Decimal(rows[0]?.cashIn || 0).toNumber(),
      cashOutflow: new Decimal(rows[0]?.cashOut || 0).toNumber(),
      creditSales: new Decimal(rows[0]?.creditIn || 0).toNumber(),
      netCashFlow: new Decimal(rows[0]?.cashIn || 0).minus(new Decimal(rows[0]?.cashOut || 0)).toNumber()
    })),
    
    // Credit Sales Analysis
    db.select({
      totalCredit: dbSum(creditSale.amount),
      totalPaid: dbSum(creditSale.amountPaid),
      outstandingCount: sql`COUNT(*)`,
    })
    .from(creditSale)
    .where(and(
      eq(creditSale.orgId, org.id),
      gte(creditSale.createdAt, dateFrom),
      lte(creditSale.createdAt, dateTo)
    ))
    .then(rows => ({
      totalCreditSales: new Decimal(rows[0]?.totalCredit || 0).toNumber(),
      creditCollected: new Decimal(rows[0]?.totalPaid || 0).toNumber(),
      creditOutstanding: new Decimal((rows[0]?.totalCredit || 0) as any).minus(new Decimal(rows[0]?.totalPaid || 0)).toNumber(),
      uncollectedInvoices: Number(rows[0]?.outstandingCount || 0)
    }))
  ])

  return {
    profitLoss: profitLossData,
    cashFlow: cashFlowData,
    creditAnalysis: creditAnalysis
  }
}

// Daily Financial Trend
export async function getDailyFinancialTrend(dateFrom: Date, dateTo: Date) {
  const org = await getUserOrganization()
  
  return db
    .select({
      date: sql`DATE(${sale.createdAt})`,
      revenue: dbSum(sale.total),
      expenses: dbSum(expense.amount),
    })
    .from(sale)
    .leftJoin(expense, and(
      eq(sale.orgId, expense.orgId),
      sql`DATE(${expense.createdAt}) = DATE(${sale.createdAt})`
    ))
    .where(and(
      eq(sale.orgId, org.id),
      gte(sale.createdAt, dateFrom),
      lte(sale.createdAt, dateTo)
    ))
    .groupBy(sql`DATE(${sale.createdAt})`)
    .then(rows => rows.map(r => ({
      date: (r.date as string) || new Date().toISOString().split('T')[0],
      revenue: new Decimal(r.revenue || 0).toNumber(),
      expenses: new Decimal(r.expenses || 0).toNumber(),
      profit: new Decimal(r.revenue || 0).minus(new Decimal(r.expenses || 0)).toNumber()
    })))
}

// Expense Breakdown by Category
export async function getExpenseBreakdown(dateFrom: Date, dateTo: Date) {
  const org = await getUserOrganization()
  
  return db
    .select({
      category: expense.category,
      total: dbSum(expense.amount),
      percentage: sql`ROUND(100.0 * SUM(${expense.amount}) / (SELECT SUM(amount) FROM expense WHERE org_id = ${org.id} AND created_at >= ${dateFrom} AND created_at <= ${dateTo}), 2)`,
    })
    .from(expense)
    .where(and(
      eq(expense.orgId, org.id),
      gte(expense.createdAt, dateFrom),
      lte(expense.createdAt, dateTo)
    ))
    .groupBy(expense.category)
    .then(rows => rows.map(r => ({
      category: r.category || 'General',
      amount: new Decimal(r.total || 0).toNumber(),
      percentage: Number(r.percentage || 0)
    })))
}
