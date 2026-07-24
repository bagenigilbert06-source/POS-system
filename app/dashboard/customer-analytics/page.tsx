import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Users, CalendarDays } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { getCustomerDashboardData } from '@/app/actions/dashboard-enhanced-actions'
import { CustomerMetricsCards } from '@/components/dashboards/customer-metrics-cards'
import { TopCustomersTable } from '@/components/dashboards/top-customers-table'
import { CreditSalesStatusChart } from '@/components/dashboards/credit-sales-status'

export const metadata: Metadata = { title: 'Customer Analytics' }

export default async function CustomerAnalyticsPage() {
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

  const [customerData] = await Promise.all([
    getCustomerDashboardData(today, endOfDay).catch(() => ({
      topCustomers: [],
      customerMetrics: { totalCustomers: 0, customersWithPurchases: 0, avgTransactionValue: 0 },
      creditStatus: []
    }))
  ])

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={Users}
        title="Customer Analytics"
        description="Track customer metrics, top customers, and credit sales performance."
        action={<div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dce3] bg-white px-3 text-sm font-semibold text-[#344054]"><CalendarDays className="h-4 w-4" /><span>Today</span></div>}
      />

      {/* Customer Metrics */}
      <section className="grid gap-4">
        <CustomerMetricsCards metrics={customerData.customerMetrics} currency={currency} />
      </section>

      {/* Top Customers and Credit Status */}
      <section className="grid gap-4 xl:grid-cols-2">
        <TopCustomersTable customers={customerData.topCustomers} currency={currency} />
        <CreditSalesStatusChart status={customerData.creditStatus} currency={currency} />
      </section>
    </div>
  )
}
