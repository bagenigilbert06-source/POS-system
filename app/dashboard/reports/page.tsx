import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { AlertTriangle, BarChart3, Boxes, CalendarDays, CreditCard, Package, ReceiptText, TrendingUp, UsersRound, WalletCards } from 'lucide-react'
import { db } from '@/lib/db'
import { branch } from '@/lib/db/schema'
import { OrganizationService } from '@/lib/services/organization-service'
import { getReportsOverview, getReportShifts, type ReportsOverview } from '@/lib/services/reports-service'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { ReportsCharts } from '@/components/reports/reports-charts'
import { ReportExportButton } from '@/components/reports/report-export-button'
import { ShiftHistory } from '@/components/operations/shift-history'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum, RoleEnum } from '@/lib/types/permissions'

export const metadata: Metadata = { title: 'Reports' }

const sections = ['overview', 'sales', 'products', 'payments', 'profit', 'inventory', 'shifts', 'tax', 'staff'] as const
type ReportSection = typeof sections[number]
type Params = Record<string, string | string[] | undefined>

function first(params: Params | undefined, key: string) {
  const value = params?.[key]
  return Array.isArray(value) ? value[0] : value
}

function moveDate(key: string, days: number) {
  const date = new Date(`${key}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function currentDateKey(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function resolvePeriod(preset: string, customFrom: string | undefined, customTo: string | undefined, today: string) {
  const [year, month] = today.split('-').map(Number)
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const previousMonthEnd = moveDate(monthStart, -1)
  const previousMonthStart = previousMonthEnd.slice(0, 8) + '01'
  if (preset === 'today') return { from: today, to: today }
  if (preset === 'yesterday') { const day = moveDate(today, -1); return { from: day, to: day } }
  if (preset === '7d') return { from: moveDate(today, -6), to: today }
  if (preset === '30d') return { from: moveDate(today, -29), to: today }
  if (preset === 'last_month') return { from: previousMonthStart, to: previousMonthEnd }
  if (preset === 'custom' && /^\d{4}-\d{2}-\d{2}$/.test(customFrom ?? '') && /^\d{4}-\d{2}-\d{2}$/.test(customTo ?? '') && customFrom! <= customTo!) return { from: customFrom!, to: customTo! }
  return { from: monthStart, to: today }
}

function dateRangeLabel(from: string, to: string) {
  const format = (value: string, includeYear: boolean) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', ...(includeYear ? { year: 'numeric' } : {}), timeZone: 'UTC' })
  return from === to ? format(from, true) : `${format(from, from.slice(0, 4) !== to.slice(0, 4))} – ${format(to, true)}`
}

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const authorization = await requireDashboardPermission(PermissionEnum.REPORT_VIEW)
  await requireWorkspaceModule('reports')
  const organization = await OrganizationService.getOrganization(authorization.organizationId, authorization.userId)
  if (!organization) redirect('/onboarding')

  const params = await searchParams
  const requestedSection = first(params, 'section')
  const section: ReportSection = sections.includes(requestedSection as ReportSection) ? requestedSection as ReportSection : 'overview'
  const preset = first(params, 'period') ?? 'this_month'
  const today = currentDateKey(organization.timezone || 'Africa/Nairobi')
  const period = resolvePeriod(preset, first(params, 'from'), first(params, 'to'), today)
  const accessibleBranchIds = authorization.role === RoleEnum.MANAGER ? authorization.branchIds : undefined
  const locations = await db.select({ id: branch.id, name: branch.name }).from(branch).where(and(
    eq(branch.organizationId, organization.id),
    accessibleBranchIds === undefined ? undefined : accessibleBranchIds.length ? inArray(branch.id, accessibleBranchIds) : sql`false`,
  )).orderBy(branch.name)
  const requestedBranch = first(params, 'branch')
  const selectedLocation = locations.find((location) => location.id === requestedBranch)
  const branchIds = selectedLocation ? [selectedLocation.id] : accessibleBranchIds
  const [report, shifts] = await Promise.all([
    getReportsOverview(organization.id, organization.timezone || 'Africa/Nairobi', { branchIds, ...period }),
    section === 'shifts' ? getReportShifts(organization.id, organization.timezone || 'Africa/Nairobi', { branchIds, ...period }) : Promise.resolve([]),
  ])
  const currency = organization.currency || 'KES'
  const locationLabel = selectedLocation?.name ?? (accessibleBranchIds === undefined ? 'All locations' : 'Assigned locations')
  const rangeLabel = dateRangeLabel(period.from, period.to)

  const retained = new URLSearchParams({ period: preset, from: period.from, to: period.to })
  if (selectedLocation) retained.set('branch', selectedLocation.id)

  return (
    <div className="dashboard-reports mx-auto max-w-[1480px] space-y-4 pb-8">
      <DashboardPageHeading icon={BarChart3} title="Reports" description="Review business performance with one consistent date and location scope." theme="adaptive" />

      <ReportControls section={section} preset={preset} period={period} today={today} locations={locations} selectedBranch={selectedLocation?.id} report={report} shifts={shifts} currency={currency} rangeLabel={rangeLabel} locationLabel={locationLabel} />

      <nav className="app-panel flex gap-1 overflow-x-auto p-1.5" aria-label="Report sections">
        {sections.map((item) => {
          const href = `/dashboard/reports?${new URLSearchParams({ ...Object.fromEntries(retained), section: item })}`
          return <Link key={item} href={href} aria-current={item === section ? 'page' : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-colors ${item === section ? 'bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent-strong)]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>{item}</Link>
        })}
      </nav>

      {section === 'overview' && <Overview report={report} currency={currency} rangeLabel={rangeLabel} />}
      {section === 'sales' && <><FinancialBreakdown report={report} currency={currency} /><ReportsCharts dailyData={report.daily} monthlyData={report.monthly} paymentData={report.payments} currency={currency} periodLabel={rangeLabel} /></>}
      {section === 'products' && <TopProducts report={report} currency={currency} expanded />}
      {section === 'payments' && <ReportsCharts dailyData={report.daily} monthlyData={report.monthly} paymentData={report.payments} currency={currency} periodLabel={rangeLabel} />}
      {section === 'profit' && <><ProfitSummary report={report} currency={currency} /><FinancialBreakdown report={report} currency={currency} /></>}
      {section === 'inventory' && <InventoryReport report={report} currency={currency} asOf={period.to} />}
      {section === 'shifts' && <ShiftHistory shifts={shifts} currency={currency} />}
      {section === 'tax' && <TaxReport report={report} currency={currency} />}
      {section === 'staff' && <ReportLinkPanel icon={UsersRound} title="Staff performance" detail="Review cashier sales, transaction activity and team performance using the existing staff reporting data." href="/dashboard/staff-performance" action="Open staff report" />}
    </div>
  )
}

function ReportControls({ section, preset, period, today, locations, selectedBranch, report, shifts, currency, rangeLabel, locationLabel }: { section: ReportSection; preset: string; period: { from: string; to: string }; today: string; locations: { id: string; name: string }[]; selectedBranch?: string; report: ReportsOverview; shifts: Awaited<ReturnType<typeof getReportShifts>>; currency: string; rangeLabel: string; locationLabel: string }) {
  return <section className="app-panel p-3" aria-label="Report filters"><form className="flex flex-wrap items-end gap-2" method="get"><input type="hidden" name="section" value={section} /><label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><span>Period</span><select name="period" defaultValue={preset} className="h-9 rounded-lg border bg-background px-3 text-xs font-semibold"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="this_month">This month</option><option value="last_month">Last month</option><option value="custom">Custom range</option></select></label><label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><span>From</span><input name="from" type="date" defaultValue={period.from} max={today} className="h-9 rounded-lg border bg-background px-3 text-xs" /></label><label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><span>To</span><input name="to" type="date" defaultValue={period.to} max={today} className="h-9 rounded-lg border bg-background px-3 text-xs" /></label><label className="grid min-w-44 gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><span>Location</span><select name="branch" defaultValue={selectedBranch ?? ''} className="h-9 rounded-lg border bg-background px-3 text-xs font-semibold"><option value="">All available locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><button type="submit" className="h-9 rounded-lg bg-[var(--dashboard-accent-cta)] px-4 text-xs font-bold text-[var(--dashboard-accent-cta-ink)] hover:bg-[var(--dashboard-accent-cta-hover)]">Apply</button><div className="ml-auto flex flex-wrap items-center gap-2"><span className="hidden text-[11px] text-muted-foreground lg:inline">{rangeLabel} · {locationLabel}</span>{section !== 'staff' && <ReportExportButton section={section} location={locationLabel} period={rangeLabel} currency={currency} totals={report.totals} monthly={report.monthly} payments={report.payments} topProducts={report.topProducts} shifts={shifts} inventory={report.inventory} />}</div></form></section>
}

function Overview({ report, currency, rangeLabel }: { report: ReportsOverview; currency: string; rangeLabel: string }) {
  const metrics = [
    { label: 'Net sales', value: formatCurrency(report.totals.revenue, currency), detail: 'After completed refunds', change: report.comparison.revenuePercent, icon: ReceiptText },
    { label: 'Gross profit', value: report.totals.costDataComplete ? formatCurrency(report.totals.grossProfit, currency) : 'Cost unavailable', detail: report.totals.grossMargin == null ? 'Cost data incomplete' : `${report.totals.grossMargin.toFixed(1)}% margin`, warning: !report.totals.costDataComplete, icon: TrendingUp },
    { label: 'Transactions', value: formatNumber(report.totals.transactions), detail: 'Paid transactions', change: report.comparison.transactionsPercent, icon: BarChart3 },
    { label: 'Average transaction', value: formatCurrency(report.totals.averageSale, currency), detail: rangeLabel, icon: CreditCard },
  ]
  return <><section aria-label="Primary report summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, detail, change, warning, icon: Icon }) => <article key={label} className="app-panel report-paint-boundary p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-[1.3rem] font-semibold leading-none tracking-[-0.025em] tabular-nums">{value}</p></div><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]"><Icon className="h-4 w-4" aria-hidden="true" /></div></div><div className="mt-3 flex items-center gap-2 text-[11px]"><span className={warning ? 'text-amber-600' : 'text-muted-foreground'}>{warning && <AlertTriangle className="mr-1 inline h-3 w-3" />}{detail}</span>{change != null && <span className={`ml-auto font-bold tabular-nums ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%</span>}</div></article>)}</section><FinancialBreakdown report={report} currency={currency} /><ReportsCharts dailyData={report.daily} monthlyData={report.monthly} paymentData={report.payments} currency={currency} periodLabel={rangeLabel} /><TopProducts report={report} currency={currency} /></>
}

function FinancialBreakdown({ report, currency }: { report: ReportsOverview; currency: string }) {
  const items: Array<[string, number | null]> = [['Gross sales', report.totals.grossSales], ['Discounts', report.totals.discounts], ['Refunds', report.totals.refunds], ['COGS', report.totals.costDataComplete ? report.totals.costOfGoods : null], ['Operating expenses', report.totals.expenses], ['Recorded VAT / Tax', report.totals.tax]]
  return <section className="app-panel report-paint-boundary overflow-hidden" aria-labelledby="financial-breakdown"><div className="border-b px-4 py-3.5 sm:px-5"><h2 id="financial-breakdown">Financial breakdown</h2><p className="mt-1 text-xs text-muted-foreground">The components behind net sales and profit.</p></div><dl className="grid sm:grid-cols-2 xl:grid-cols-3">{items.map(([label, value], index) => <div key={label} className={`flex items-center justify-between gap-4 px-4 py-3 sm:px-5 ${index < 3 ? 'border-b' : ''} ${index % 3 !== 2 ? 'xl:border-r' : ''}`}><dt className="text-xs text-muted-foreground">{label}</dt><dd className={`text-xs font-bold tabular-nums ${value == null ? 'text-amber-600' : ''}`}>{value == null ? 'Cost incomplete' : formatCurrency(value, currency)}</dd></div>)}</dl></section>
}

function TopProducts({ report, currency, expanded = false }: { report: ReportsOverview; currency: string; expanded?: boolean }) {
  return <section className="report-deferred-section app-panel report-paint-boundary overflow-hidden"><div className="border-b px-4 py-4 sm:px-5"><h2>Top products</h2><p className="mt-1 text-xs text-muted-foreground">Ranked by recorded sales value in this report period.</p></div>{report.topProducts.length ? <div className="divide-y">{report.topProducts.slice(0, expanded ? 8 : 5).map((item, index) => <div key={item.name} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-5"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-xs font-bold text-[var(--dashboard-accent)]">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{formatNumber(item.quantity)} units</p></div><p className="text-xs"><span className="text-muted-foreground">Revenue </span><strong className="tabular-nums">{formatCurrency(item.revenue, currency)}</strong></p><p className="text-xs"><span className="text-muted-foreground">Profit </span><strong className="tabular-nums">{item.profit == null ? 'Cost unavailable' : formatCurrency(item.profit, currency)}</strong></p></div>)}</div> : <Empty title="No product sales yet" />}</section>
}

function ProfitSummary({ report, currency }: { report: ReportsOverview; currency: string }) { const reliable = report.totals.costDataComplete; return <section className="grid gap-3 sm:grid-cols-3"><SummaryCard label="Gross profit" value={reliable ? formatCurrency(report.totals.grossProfit, currency) : 'Cost unavailable'} detail={report.totals.grossMargin == null ? 'Cost data incomplete' : `${report.totals.grossMargin.toFixed(1)}% gross margin`} /><SummaryCard label="Operating expenses" value={formatCurrency(report.totals.expenses, currency)} detail="Recorded expenses" /><SummaryCard label="Net profit" value={reliable ? formatCurrency(report.totals.netProfit, currency) : 'Cost unavailable'} detail={reliable ? 'Gross profit less expenses' : 'Complete product costs to calculate'} /></section> }

function InventoryReport({ report, currency, asOf }: { report: ReportsOverview; currency: string; asOf: string }) { return <section className="app-panel report-paint-boundary p-5"><div className="flex items-start justify-between"><div><h2>Inventory value as of {dateRangeLabel(asOf, asOf)}</h2><p className="mt-1 text-xs text-muted-foreground">A point-in-time stock valuation, separate from the selected sales performance.</p></div><Package className="h-5 w-5 text-[var(--dashboard-accent)]" /></div><dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard label="Products tracked" value={formatNumber(report.inventory.products)} detail={`${formatNumber(report.inventory.units)} available units`} /><SummaryCard label="Inventory cost" value={formatCurrency(report.inventory.cost, currency)} detail="Current recorded cost" /><SummaryCard label="Estimated retail value" value={formatCurrency(report.inventory.retailValue, currency)} detail="At current selling prices" /><SummaryCard label="Potential gross margin" value={formatCurrency(Math.max(0, report.inventory.retailValue - report.inventory.cost), currency)} detail="Not recognized revenue" /><SummaryCard label="Low stock" value={formatNumber(report.inventory.lowStock)} detail="Products at or below minimum" /><SummaryCard label="Out of stock" value={formatNumber(report.inventory.outOfStock)} detail="Products with no available units" /><SummaryCard label="Reorder value" value={formatCurrency(report.inventory.reorderValue, currency)} detail="Cost to restore minimum levels" /></dl></section> }

function TaxReport({ report, currency }: { report: ReportsOverview; currency: string }) { return <section className="grid gap-3 sm:grid-cols-3"><SummaryCard label="Recorded VAT / Tax" value={formatCurrency(report.totals.tax, currency)} detail="Tax stored on paid sales" /><SummaryCard label="Net sales" value={formatCurrency(report.totals.revenue, currency)} detail="After completed refunds" /><SummaryCard label="Transactions" value={formatNumber(report.totals.transactions)} detail="Paid transactions in scope" /></section> }

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border bg-[var(--dashboard-surface-subtle)] p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-bold tabular-nums">{value}</p><p className="mt-2 text-[11px] text-muted-foreground">{detail}</p></div> }
function Empty({ title }: { title: string }) { return <div className="flex min-h-40 items-center justify-center p-6 text-sm text-muted-foreground">{title}</div> }
function ReportLinkPanel({ icon: Icon, title, detail, href, action }: { icon: typeof Boxes; title: string; detail: string; href: string; action: string }) { return <section className="app-panel p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]"><Icon className="h-5 w-5" /></span><div><h2>{title}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{detail}</p><Link href={href} className="mt-4 inline-flex h-9 items-center rounded-lg bg-[var(--dashboard-accent-cta)] px-4 text-xs font-bold text-[var(--dashboard-accent-cta-ink)]">{action}</Link></div></div></section> }
