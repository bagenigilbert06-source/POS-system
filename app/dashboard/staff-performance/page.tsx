import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Users, CalendarDays } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { getStaffPerformanceData } from '@/app/actions/staff-dashboard-actions'
import { StaffMetricsCards } from '@/components/dashboards/staff-metrics-cards'
import { TopStaffTable } from '@/components/dashboards/top-staff-table'
import { StaffActivityChart } from '@/components/dashboards/staff-activity-chart'

export const metadata: Metadata = { title: 'Staff Performance' }

export default async function StaffPerformancePage() {
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

  const [staffData] = await Promise.all([
    getStaffPerformanceData(today, endOfDay).catch(() => ({
      topStaff: [],
      staffMetrics: { totalStaff: 0, activeStaff: 0, totalSalesValue: 0, totalTransactions: 0, avgPerStaff: 0 },
      performanceTrend: []
    }))
  ])

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={Users}
        title="Staff Performance"
        description="Track staff metrics, sales performance, and activity patterns."
        action={<div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dce3] bg-white px-3 text-sm font-semibold text-[#344054]"><CalendarDays className="h-4 w-4" /><span>Today</span></div>}
      />

      {/* Staff Metrics */}
      <section className="grid gap-4">
        <StaffMetricsCards metrics={staffData.staffMetrics} currency={currency} />
      </section>

      {/* Staff Activity and Top Performers */}
      <section className="grid gap-4 xl:grid-cols-2">
        <StaffActivityChart data={staffData.performanceTrend} currency={currency} />
        <TopStaffTable staff={staffData.topStaff} currency={currency} />
      </section>
    </div>
  )
}
