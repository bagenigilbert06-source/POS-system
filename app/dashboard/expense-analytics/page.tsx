import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { CreditCard, CalendarDays } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { getExpenseDashboardData } from '@/app/actions/dashboard-enhanced-actions'
import { ExpenseByCategoryChart } from '@/components/dashboards/expense-by-category'
import { ExpenseTrendChart } from '@/components/dashboards/expense-trend-chart'
import { TopExpensesTable } from '@/components/dashboards/top-expenses-table'

export const metadata: Metadata = { title: 'Expense Analytics' }

export default async function ExpenseAnalyticsPage() {
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

  const [expenseData] = await Promise.all([
    getExpenseDashboardData(today, endOfDay).catch(() => ({
      expenseByCategory: [],
      expenseTrends: [],
      topExpenses: []
    }))
  ])

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={CreditCard}
        title="Expense Analytics"
        description="Track daily expenses by category, trends, and top expenses."
        action={<div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dce3] bg-white px-3 text-sm font-semibold text-[#344054]"><CalendarDays className="h-4 w-4" /><span>Today</span></div>}
      />

      {/* Expense by Category and Trends */}
      <section className="grid gap-4 xl:grid-cols-2">
        <ExpenseByCategoryChart data={expenseData.expenseByCategory} currency={currency} />
        <ExpenseTrendChart data={expenseData.expenseTrends} currency={currency} />
      </section>

      {/* Top Expenses */}
      <section className="grid gap-4">
        <TopExpensesTable expenses={expenseData.topExpenses} currency={currency} />
      </section>
    </div>
  )
}
