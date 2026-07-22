import type { Metadata } from 'next'
import { startOfMonth } from 'date-fns'
import { WalletCards } from 'lucide-react'
import { getExpenses } from '@/app/actions/expenses'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { ExpenseManager } from '@/components/expenses/expense-manager'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { formatCurrency } from '@/lib/utils'

export const metadata: Metadata = { title: 'Expenses | Pesaby' }

export default async function ExpensesPage() {
  const { organization } = await requireWorkspaceModule('expenses')
  const expenses = await getExpenses()
  const now = new Date()
  const monthStart = startOfMonth(now)
  const month = expenses.filter((item) => item.createdAt >= monthStart)
  const today = expenses.filter((item) => item.createdAt.toDateString() === now.toDateString())
  const sum = (items: typeof expenses) => items.reduce((total, item) => total + Number(item.amount), 0)
  const currency = organization.currency || 'KES'
  const largest = month.reduce((max, item) => Math.max(max, Number(item.amount)), 0)

  return <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8"><DashboardPageHeading icon={WalletCards} title="Expenses" description="Record and control the operating costs that affect business performance." /><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
    ['Today', formatCurrency(sum(today), currency), `${today.length} records`],
    ['This month', formatCurrency(sum(month), currency), `${month.length} records`],
    ['Largest this month', formatCurrency(largest, currency), 'Single expense'],
    ['All recorded', formatCurrency(sum(expenses), currency), `${expenses.length} records loaded`],
  ].map(([label, value, detail]) => <article key={label} className="metric-card"><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></article>)}</section><ExpenseManager initialExpenses={expenses} currency={currency} /></div>
}
