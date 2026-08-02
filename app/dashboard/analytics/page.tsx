import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { BarChart3, CalendarDays } from 'lucide-react'
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
import {
  getSalesTrendData,
  getCustomerCohorts,
  getRepeatCustomerMetrics,
  getProductPerformance,
  getStaffKPIs,
  getHourlyPatterns,
  getSalesForecast,
} from '@/app/actions/analytics-actions'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  await requireWorkspaceModule('analytics')
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const currency = organization.currency || 'KES'
  
  // Fetch all analytics data in parallel from real database queries
  const [
    trendData,
    cohortData,
    repeatData,
    productData,
    staffData,
    hourlyData,
    forecastData,
  ] = await Promise.all([
    getSalesTrendData(30).catch(() => []),
    getCustomerCohorts().catch(() => []),
    getRepeatCustomerMetrics().catch(() => []),
    getProductPerformance().catch(() => []),
    getStaffKPIs().catch(() => []),
    getHourlyPatterns().catch(() => []),
    getSalesForecast(30).catch(() => []),
  ])

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
    trendData: trendData.map((row) => ({
      date: String(row.date),
      revenue: Number(row.total ?? 0),
      transactions: Number(row.count ?? 0),
    })),
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
    forecastData: forecastData.map((row) => ({
      date: row.date,
      forecast: Number(row.predicted ?? 0),
      confidence: 'low' as const,
    })),
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={BarChart3}
        title="Analytics"
        description="Deep dive analytics with trends, forecasts, and performance metrics."
        action={<div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dce3] bg-white px-3 text-sm font-semibold text-[#344054]"><CalendarDays className="h-4 w-4" /><span>Last 30 days</span></div>}
      />

      {/* Trend Analysis */}
      <section className="grid gap-4">
        <TrendAnalysis data={analytics.trendData} currency={currency} />
      </section>

      {/* Hourly Patterns and Forecasting */}
      <section className="grid gap-4 xl:grid-cols-2">
        <HourlyPatterns data={analytics.hourlyData} currency={currency} />
        <Forecasting historical={analytics.forecastData} currency={currency} />
      </section>

      {/* Customer Cohorts and Repeat Customers */}
      <section className="grid gap-4 xl:grid-cols-2">
        <CustomerCohort cohorts={analytics.cohortData} />
        <RepeatCustomers data={analytics.repeatData} />
      </section>

      {/* Product Performance */}
      <section className="grid gap-4">
        <ProductPerformance products={analytics.productData} currency={currency} />
      </section>

      {/* Staff KPIs */}
      <section className="grid gap-4">
        <StaffKPIs staff={analytics.staffData} currency={currency} />
      </section>
    </div>
  )
}
