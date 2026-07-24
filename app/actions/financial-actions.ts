'use server'

import { db } from '@/lib/db'
import { sale, expense, purchase, generalLedger, financialStatement } from '@/lib/db/schema'
import { eq, gte, lte, and } from 'drizzle-orm'
import { getUserId, getOrgId } from '@/lib/auth'
import { sql } from 'drizzle-orm'

export async function getFinancialStatements() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)
  const currentMonth = new Date()
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

  try {
    // Calculate Income Statement data
    const incomeData = await db
      .select({
        revenue: sql<number>`SUM(CAST(${sale.total} AS FLOAT))`,
        totalExpenses: sql<number>`SUM(CAST(${expense.amount} AS FLOAT))`,
      })
      .from(sale)
      .leftJoin(expense, and(eq(sale.orgId, expense.orgId), gte(expense.createdAt, monthStart)))
      .where(
        and(
          eq(sale.orgId, orgId),
          gte(sale.createdAt, monthStart),
          lte(sale.createdAt, monthEnd)
        )
      )

    const revenue = incomeData[0]?.revenue || 0
    const totalExpenses = incomeData[0]?.totalExpenses || 0
    const netIncome = revenue - totalExpenses

    const incomeStatement = {
      period: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`,
      revenue,
      costOfGoods: 0, // Would need inventory data
      grossProfit: revenue,
      operatingExpenses: totalExpenses,
      netIncome,
    }

    // Calculate Balance Sheet data (simplified)
    const totalAssets = await db
      .select({
        total: sql<number>`SUM(CAST(${sale.total} AS FLOAT))`,
      })
      .from(sale)
      .where(eq(sale.orgId, orgId))

    const balanceSheet = {
      assets: {
        cash: totalAssets[0]?.total || 0,
        inventory: 0,
        receivables: 0,
      },
      liabilities: {
        payable: 0,
      },
      equity: totalAssets[0]?.total || 0,
    }

    // Calculate Cash Flow (simplified)
    const cashFlow = {
      operatingActivities: revenue,
      investingActivities: 0,
      financingActivities: 0,
      netCashChange: revenue,
    }

    return {
      incomeStatement,
      balanceSheet,
      cashFlow,
    }
  } catch (error) {
    console.error('[v0] Error fetching financial statements:', error)
    return {
      incomeStatement: null,
      balanceSheet: null,
      cashFlow: null,
    }
  }
}

export async function getGeneralLedger(accountId?: string) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    let query = db.select().from(generalLedger).where(eq(generalLedger.orgId, orgId))

    if (accountId) {
      query = query.where(eq(generalLedger.accountId, accountId))
    }

    const entries = await query.orderBy(generalLedger.date)
    return entries
  } catch (error) {
    console.error('[v0] Error fetching general ledger:', error)
    return []
  }
}

export async function recordGeneralLedgerEntry(data: {
  accountId: string
  debit?: number
  credit?: number
  description?: string
  referenceType?: string
  referenceId?: string
}) {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const entry = await db
      .insert(generalLedger)
      .values({
        id: `gl_${Date.now()}`,
        accountId: data.accountId,
        debit: data.debit?.toString() || '0',
        credit: data.credit?.toString() || '0',
        description: data.description,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        date: new Date(),
        orgId,
      })
      .returning()

    return { success: true, entry: entry[0] }
  } catch (error) {
    console.error('[v0] Error recording GL entry:', error)
    throw new Error('Failed to record general ledger entry')
  }
}

export async function getMonthlyComparison() {
  const userId = await getUserId()
  const orgId = await getOrgId(userId)

  try {
    const currentDate = new Date()
    const months = []

    // Get data for last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const data = await db
        .select({
          revenue: sql<number>`SUM(CAST(${sale.total} AS FLOAT))`,
          expenses: sql<number>`SUM(CAST(${expense.amount} AS FLOAT))`,
        })
        .from(sale)
        .leftJoin(expense, eq(sale.orgId, expense.orgId))
        .where(
          and(
            eq(sale.orgId, orgId),
            gte(sale.createdAt, monthStart),
            lte(sale.createdAt, monthEnd)
          )
        )

      months.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        revenue: data[0]?.revenue || 0,
        expenses: data[0]?.expenses || 0,
        profit: (data[0]?.revenue || 0) - (data[0]?.expenses || 0),
      })
    }

    return months
  } catch (error) {
    console.error('[v0] Error fetching monthly comparison:', error)
    return []
  }
}
