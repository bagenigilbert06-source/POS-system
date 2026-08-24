import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { BarChart3, CalendarDays, CreditCard, ReceiptText, RefreshCw, Sparkles } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireWorkspaceModule } from '@/lib/onboarding/require-module'
import { TrendAnalysis } from '@/components/analytics/trend-analysis'
import { CustomerCohort } from '@/components/analytics/customer-cohort'
import { RepeatCustomers } from '@/components/analytics/repeat-customers'
import { ProductPerformance } from '@/components/analytics/product-performance'
import { StaffKPIs } from '@/components/analytics/staff-kpis'
import { HourlyPatterns } from '@/components/analytics/hourly-patterns'
import { Forecasting } from '@/components/analytics/forecasting'
import { PaymentMix } from '@/components/analytics/payment-mix'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
import {
  getSalesTrendData,
  getCustomerCohorts,
  getRepeatCustomerMetrics,
  getProductPerformance,
  getStaffKPIs,
  getHourlyPatterns,
  getPaymentMix,
  getSalesForecast,
} from '@/app/actions/analytics-actions'
import { getProductTerminology } from '@/lib/products/terminology'

export const metadata: Metadata = { title: 'Analytics' }

type Params = { period?: string | string[] }

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

function change(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function fillDailyTrend(rows: Array<{ date: string; total: number; count: number }>, days: number, timezone: string) {
  const totals = new Map(rows.map((row) => [String(row.date).slice(0, 10), row]))
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const today = new Date(`${todayKey}T00:00:00Z`)
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setUTCDate(today.getUTCDate() - (days - index - 1))
    const key = date.toISOString().slice(0, 10)
    const row = totals.get(key)
    return { date: key, revenue: Number(row?.total ?? 0), transactions: Number(row?.count ?? 0) }
  })
}

export default async function AnalyticsPage({ searchParams }: { searchParams?: Promise<Params> }) {
  await requireDashboardPermission(PermissionEnum.REPORT_VIEW)
  const { config } = await requireWorkspaceModule('analytics')
  const productTerms = getProductTerminology(config.businessType, config.businessCategory)
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const currency = organization.currency || 'KES'
  const timezone = organization.timezone || 'Africa/Nairobi'
  const requestedPeriod = first((await searchParams)?.period)
  const days = requestedPeriod === '7' ? 7 : requestedPeriod === '90' ? 90 : 30
  
  // Fetch all analytics data in parallel from real database queries
  const [
    trendData,
    cohortData,
    repeatData,
    productData,
    staffData,
    hourlyData,
    paymentData,
    forecastData,
  ] = await Promise.all([
    getSalesTrendData(days, timezone).catch(() => []),
    getCustomerCohorts().catch(() => []),
    getRepeatCustomerMetrics(days).catch(() => []),
    getProductPerformance(days).catch(() => []),
    getStaffKPIs(days).catch(() => []),
    getHourlyPatterns(days, timezone).catch(() => []),
    getPaymentMix(days).catch(() => []),
    getSalesForecast(30).catch(() => []),
  ])
  const normalizedTrendData = fillDailyTrend(trendData, days, timezone)

  // The query layer returns database-oriented names. Normalize them once here so
  // the charts receive a stable, numeric contract (Postgres aggregates may be strings).
  const repeatBuckets = [
    { visits: '1 visit', min: 1, max: 1 },
    { visits: '2 visits', min: 2, max: 2 },
    { visits: '3–5 visits', min: 3, max: 5 },
    { visits: '6+ visits', min: 6, max: Number.POSITIVE_INFINITY },
  ]
  const repeatTotal = repeatData.length
  const analytics = {
    trendData: normalizedTrendData,
    cohortData: cohortData.map((row) => {
      const size = Number(row.cohortSize ?? 0)
      const retained = Number(row.repeatPurchases ?? 0)
      return {
        period: new Date(row.joinMonth).toLocaleDateString('en', { month: 'short', year: 'numeric' }),
        newCustomers: size,
        retained,
        churn: Math.max(0, size - retained),
        retention: size > 0 ? Math.round((retained / size) * 100) : 0,
      }
    }),
    repeatData: repeatBuckets.map((bucket) => {
      const count = repeatData.filter((row) => {
        const visits = Number(row.purchaseCount ?? 0)
        return visits >= bucket.min && visits <= bucket.max
      }).length
      return {
        visits: bucket.visits,
        count,
        percentage: repeatTotal > 0 ? Math.round((count / repeatTotal) * 100) : 0,
      }
    }),
    productData: productData.map((row) => ({
      id: row.productId,
      name: row.productName,
      revenue: Number(row.revenue ?? 0),
      units: Number(row.unitsSold ?? 0),
      trend: 'stable' as const,
      margin: Number(row.margin ?? 0),
    })),
    staffData: staffData.map((row, index) => ({
      id: row.employeeId,
      name: row.employeeName,
      totalSales: Number(row.totalSales ?? 0),
      transactions: Number(row.transactionCount ?? 0),
      avgSale: Number(row.averageTransaction ?? 0),
      ranking: index + 1,
      topPerformer: index === 0 && Number(row.totalSales ?? 0) > 0,
    })),
    hourlyData: hourlyData.map((row) => ({
      hour: `${String(Number(row.hour ?? 0)).padStart(2, '0')}:00`,
      sales: Number(row.totalSales ?? 0),
      transactions: Number(row.transactionCount ?? 0),
    })),
    paymentData: paymentData.map((row) => ({
      method: row.method,
      revenue: Number(row.revenue ?? 0),
      transactions: Number(row.transactions ?? 0),
    })),
    forecastData: [
      ...normalizedTrendData.slice(-30).map((row) => ({
        date: row.date,
        actual: row.revenue,
        forecast: 0,
        confidence: 'high' as const,
      })),
      ...forecastData.filter((row) => !('actual' in row)).map((row) => ({
        date: row.date,
        actual: undefined,
        forecast: Number(row.predicted ?? 0),
        confidence: row.confidence,
      })),
    ],
  }

  const revenue = analytics.trendData.reduce((total, row) => total + row.revenue, 0)
  const transactions = analytics.trendData.reduce((total, row) => total + row.transactions, 0)
  const midpoint = Math.floor(analytics.trendData.length / 2)
  const previousRows = analytics.trendData.slice(0, midpoint)
  const currentRows = analytics.trendData.slice(midpoint)
  const previousRevenue = previousRows.reduce((total, row) => total + row.revenue, 0)
  const currentRevenue = currentRows.reduce((total, row) => total + row.revenue, 0)
  const previousTransactions = previousRows.reduce((total, row) => total + row.transactions, 0)
  const currentTransactions = currentRows.reduce((total, row) => total + row.transactions, 0)
  const repeatCustomers = repeatData.filter((row) => Number(row.purchaseCount ?? 0) > 1).length
  const repeatRate = repeatTotal ? (repeatCustomers / repeatTotal) * 100 : 0
  const bestDay = analytics.trendData.filter((row) => row.revenue > 0).reduce<(typeof analytics.trendData)[number] | undefined>((best, row) => !best || row.revenue > best.revenue ? row : best, undefined)
  const peakHour = analytics.hourlyData.reduce<(typeof analytics.hourlyData)[number] | undefined>((best, row) => !best || row.sales > best.sales ? row : best, undefined)
  const topProduct = analytics.productData[0]
  const topStaff = analytics.staffData.find((row) => row.totalSales > 0)

  return (
    <div className="dashboard-analytics mx-auto max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={BarChart3}
        title="Analytics"
        description={`Understand revenue, customer behaviour, ${productTerms.pluralLower} and team performance.`}
        theme="adaptive"
        action={<div className="flex items-center gap-1 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-1" aria-label="Analytics period"><CalendarDays className="ml-2 h-4 w-4 text-[var(--dashboard-muted)]" />{[7, 30, 90].map((period) => <Link key={period} href={`/dashboard/analytics?period=${period}`} aria-current={days === period ? 'page' : undefined} className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${days === period ? 'bg-[var(--dashboard-accent-cta)] text-[var(--dashboard-accent-cta-ink)]' : 'text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-subtle)] hover:text-[var(--dashboard-text)]'}`}>{period}d</Link>)}</div>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Analytics summary">
        <AnalyticsMetric icon={ReceiptText} label="Revenue" value={formatMoney(revenue, currency)} detail={`Last ${days} days`} comparison={transactions ? change(currentRevenue, previousRevenue) : null} />
        <AnalyticsMetric icon={BarChart3} label="Transactions" value={transactions.toLocaleString('en-KE')} detail={`${analytics.trendData.filter((row) => row.transactions > 0).length} active sales days`} comparison={transactions ? change(currentTransactions, previousTransactions) : null} />
        <AnalyticsMetric icon={CreditCard} label="Average sale" value={formatMoney(transactions ? revenue / transactions : 0, currency)} detail="Per completed transaction" />
        <AnalyticsMetric icon={RefreshCw} label="Repeat customer rate" value={`${repeatRate.toFixed(1)}%`} detail={`${repeatCustomers} returning customers`} />
      </section>

      <section className="app-panel overflow-hidden" aria-labelledby="analytics-highlights">
        <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-5"><div><h2 id="analytics-highlights">Performance highlights</h2><p className="mt-1 text-xs text-muted-foreground">The strongest signals in the selected period.</p></div><Sparkles className="h-4 w-4 text-[var(--dashboard-accent)]" /></div>
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Highlight label="Best sales day" value={bestDay ? formatMoney(bestDay.revenue, currency) : 'No sales yet'} detail={bestDay ? readableDate(bestDay.date) : 'Record a completed sale'} />
          <Highlight label="Peak hour" value={peakHour?.hour ?? 'No pattern yet'} detail={peakHour ? `${formatMoney(peakHour.sales, currency)} across ${peakHour.transactions} sales` : 'Sales by hour will appear here'} />
          <Highlight label={`Top ${productTerms.singularLower}`} value={topProduct?.name ?? `No ${productTerms.singularLower} sales`} detail={topProduct ? `${topProduct.units.toLocaleString('en-KE')} units · ${formatMoney(topProduct.revenue, currency)}` : `Sell a tracked ${productTerms.singularLower} to rank it`} />
          <Highlight label="Top performer" value={topStaff?.name ?? 'No staff sales'} detail={topStaff ? `${topStaff.transactions} transactions · ${formatMoney(topStaff.totalSales, currency)}` : 'Staff sales will appear here'} />
        </div>
      </section>

      <section className="grid gap-4">
        <TrendAnalysis data={analytics.trendData} currency={currency} days={days} />
      </section>

      {/* Hourly Patterns and Forecasting */}
      <section className="grid gap-4 xl:grid-cols-2">
        <HourlyPatterns data={analytics.hourlyData} currency={currency} />
        <Forecasting historical={analytics.forecastData} currency={currency} />
      </section>

      {/* Customer and payment behaviour */}
      <section className="grid gap-4 xl:grid-cols-3">
        <PaymentMix data={analytics.paymentData} currency={currency} />
        <CustomerCohort cohorts={analytics.cohortData} />
        <RepeatCustomers data={analytics.repeatData} />
      </section>

      {/* Product Performance */}
      <section className="grid gap-4">
        <ProductPerformance products={analytics.productData} currency={currency} terminology={productTerms} />
      </section>

      {/* Staff KPIs */}
      <section className="grid gap-4">
        <StaffKPIs staff={analytics.staffData} currency={currency} />
      </section>
    </div>
  )
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function readableDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function AnalyticsMetric({ icon: Icon, label, value, detail, comparison }: { icon: LucideIcon; label: string; value: string; detail: string; comparison?: number | null }) {
  return <article className="app-panel p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-[1.3rem] font-semibold leading-none tracking-[-0.025em] tabular-nums">{value}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]"><Icon className="h-4 w-4" /></span></div><div className="mt-3 flex items-center justify-between gap-2 text-[11px]"><span className="text-muted-foreground">{detail}</span>{comparison != null && <span className={`font-bold tabular-nums ${comparison >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{comparison >= 0 ? '↑' : '↓'} {Math.abs(comparison).toFixed(1)}%</span>}</div></article>
}

function Highlight({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="min-w-0 px-4 py-4 sm:px-5"><p className="text-[11px] font-medium text-muted-foreground">{label}</p><p className="mt-1.5 truncate text-sm font-semibold text-[var(--dashboard-text)]">{value}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{detail}</p></div>
}
