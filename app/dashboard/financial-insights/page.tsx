import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TrendingUp, CalendarDays } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { getFinancialInsightData, getDailyFinancialTrend, getExpenseBreakdown } from '@/app/actions/financial-dashboard-actions'
import { ProfitLossCards } from '@/components/dashboards/profit-loss-cards'
import { CashFlowChart } from '@/components/dashboards/cash-flow-chart'
import { ProfitTrendChart } from '@/components/dashboards/profit-trend-chart'
import { CreditSalesCard } from '@/components/dashboards/credit-sales-card'
import { ExpenseBreakdownChart } from '@/components/dashboards/expense-breakdown-chart'

export const metadata: Metadata = { title: 'Financial Insights' }

export default async function FinancialInsightsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const currency = organization.currency || 'KES'
  
  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endOfDay = new Date(today)
  endOfDay.setHours(23, 59, 59, 999)

  const [financialData, trendData, expenseData] = await Promise.all([
    getFinancialInsightData(today, endOfDay).catch(() => ({
      profitLoss: { revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, operatingProfit: 0, profitMargin: 0 },
      cashFlow: { cashInflow: 0, cashOutflow: 0, creditSales: 0, netCashFlow: 0 },
      creditAnalysis: { totalCreditSales: 0, creditCollected: 0, creditOutstanding: 0, uncollectedInvoices: 0 }
    })),
    getDailyFinancialTrend(today, endOfDay).catch(() => []),
    getExpenseBreakdown(today, endOfDay).catch(() => [])
  ])

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={TrendingUp}
        title="Financial Insights"
        description="Profit & loss analysis, cash flow, and financial health metrics."
        action={<div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dce3] bg-white px-3 text-sm font-semibold text-[#344054]"><CalendarDays className="h-4 w-4" /><span>Today</span></div>}
      />

      {/* Profit & Loss KPIs */}
      <section className="grid gap-4">
        <ProfitLossCards data={financialData.profitLoss} currency={currency} />
      </section>

      {/* Cash Flow and Credit Analysis */}
      <section className="grid gap-4 xl:grid-cols-2">
        <CashFlowChart data={financialData.cashFlow} currency={currency} />
        <CreditSalesCard data={financialData.creditAnalysis} currency={currency} />
      </section>

      {/* Profit Trend and Expense Breakdown */}
      <section className="grid gap-4 xl:grid-cols-2">
        <ProfitTrendChart data={trendData} currency={currency} />
        <ExpenseBreakdownChart data={expenseData} currency={currency} />
      </section>
    </div>
  )
}
