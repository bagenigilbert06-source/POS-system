import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { BarChart3, CalendarDays } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { getSalesDashboardData } from '@/app/actions/dashboard-enhanced-actions'
import { SalesHourlyChart } from '@/components/dashboards/sales-hourly-chart'
import { SalesByCategoryChart } from '@/components/dashboards/sales-by-category'
import { TopProductsTable } from '@/components/dashboards/top-products-table'
import { SalesByPaymentChart } from '@/components/dashboards/sales-by-payment'

export const metadata: Metadata = { title: 'Sales Analytics' }

export default async function SalesAnalyticsPage() {
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

  const [salesData] = await Promise.all([
    getSalesDashboardData(today, endOfDay).catch(() => ({
      salesByHour: [],
      salesByCategory: [],
      topProducts: [],
      salesByPayment: []
    }))
  ])

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={BarChart3}
        title="Sales Analytics"
        description="Daily sales breakdown by time, category, products, and payment methods."
        action={<div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dce3] bg-white px-3 text-sm font-semibold text-[#344054]"><CalendarDays className="h-4 w-4" /><span>Today</span></div>}
      />

      {/* Hourly Sales Pattern */}
      <section className="grid gap-4">
        <SalesHourlyChart data={salesData.salesByHour} currency={currency} />
      </section>

      {/* Sales by Category and Payment Method */}
      <section className="grid gap-4 xl:grid-cols-2">
        <SalesByCategoryChart data={salesData.salesByCategory} currency={currency} />
        <SalesByPaymentChart data={salesData.salesByPayment} currency={currency} />
      </section>

      {/* Top Products */}
      <section className="grid gap-4">
        <TopProductsTable products={salesData.topProducts} currency={currency} />
      </section>
    </div>
  )
}
