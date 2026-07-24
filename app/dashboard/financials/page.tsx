import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { BarChart3, Download } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { IncomeStatement } from '@/components/financials/income-statement'
import { BalanceSheet } from '@/components/financials/balance-sheet'
import { CashFlowStatement } from '@/components/financials/cash-flow-statement'
import { getFinancialStatements } from '@/app/actions/financial-actions'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Financial Statements' }

export default async function FinancialsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const currency = organization.currency || 'KES'
  
  // Fetch financial data
  const statements = await getFinancialStatements().catch(() => ({
    incomeStatement: null,
    balanceSheet: null,
    cashFlow: null,
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <DashboardPageHeading
          icon={BarChart3}
          title="Financial Statements"
          description="Income statement, balance sheet, and cash flow analysis."
        />
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Income Statement */}
      <section className="rounded-lg border bg-card p-6">
        <IncomeStatement data={statements.incomeStatement} currency={currency} />
      </section>

      {/* Balance Sheet and Cash Flow */}
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <BalanceSheet data={statements.balanceSheet} currency={currency} />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <CashFlowStatement data={statements.cashFlow} currency={currency} />
        </div>
      </section>
    </div>
  )
}
