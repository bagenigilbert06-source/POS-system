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

  const analytics = {
    trendData,
    cohortData,
    repeatData,
    productData,
    staffData,
    hourlyData,
    forecastData,
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
