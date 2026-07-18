import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { BarChart3, CalendarDays, Package, ReceiptText, Tags } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { getReportsOverview } from '@/lib/services/reports-service'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { ReportsCharts } from '@/components/reports/reports-charts'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'

export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage() {
  await requireWorkspaceModule('reports')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const report = await getReportsOverview(organization.id, organization.timezone || 'Africa/Nairobi')
  const currency = organization.currency || 'KES'

  const metrics = [
    { label: 'Net sales', value: formatCurrency(report.totals.revenue, currency), detail: `${formatNumber(report.totals.transactions)} completed transactions`, icon: ReceiptText },
    { label: 'Average sale', value: formatCurrency(report.totals.averageSale, currency), detail: 'Per completed transaction', icon: BarChart3 },
    { label: 'Recorded tax', value: formatCurrency(report.totals.tax, currency), detail: 'Tax stored on completed sales', icon: Tags },
    { label: 'Discounts', value: formatCurrency(report.totals.discounts, currency), detail: 'Discounts stored on completed sales', icon: CalendarDays },
  ]

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={BarChart3}
        title="Reports"
        description="Review six months of recorded sales, payments and inventory value."
        action={<div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dce3] bg-white px-3 text-sm font-semibold text-[#344054]"><CalendarDays className="h-4 w-4" /><span>{report.period.label}</span></div>}
      />

      <section aria-label="Report summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="app-panel p-4 sm:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Icon className="h-4 w-4" aria-hidden="true" /></div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">{value}</p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
          </article>
        ))}
      </section>

      <ReportsCharts monthlyData={report.monthly} paymentData={report.payments} currency={currency} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <article className="app-panel overflow-hidden">
          <div className="border-b px-4 py-4 sm:px-5">
            <h2 className="font-bold">Top products</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ranked by recorded sales value in this report period.</p>
          </div>
          {report.topProducts.length ? (
            <div className="divide-y">
              {report.topProducts.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-xs font-extrabold text-accent-foreground">{index + 1}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-xs text-muted-foreground">{formatNumber(item.quantity)} units sold</p></div>
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(item.revenue, currency)}</p>
                </div>
              ))}
            </div>
          ) : <ReportEmpty title="No product sales yet" detail="Completed sales with product lines will appear here." />}
        </article>

        <article className="app-panel p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">Inventory valuation</h2><p className="mt-1 text-sm text-muted-foreground">Current active product stock.</p></div><Package className="h-5 w-5 text-primary" /></div>
          <dl className="mt-5 divide-y">
            <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-muted-foreground">Products</dt><dd className="font-bold tabular-nums">{formatNumber(report.inventory.products)}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-muted-foreground">Recorded cost</dt><dd className="font-bold tabular-nums">{formatCurrency(report.inventory.cost, currency)}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-muted-foreground">Estimated retail value</dt><dd className="font-bold tabular-nums">{formatCurrency(report.inventory.retailValue, currency)}</dd></div>
          </dl>
          <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">Retail value is an estimate based on current units and selling prices. It is not recognized revenue.</p>
        </article>
      </section>
    </div>
  )
}

function ReportEmpty({ title, detail }: { title: string; detail: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center"><BarChart3 className="h-7 w-7 text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div>
}
