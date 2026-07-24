import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Package, AlertTriangle } from 'lucide-react'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { getInventoryDashboardData } from '@/app/actions/dashboard-enhanced-actions'
import { InventoryMetricsCards } from '@/components/dashboards/inventory-metrics-cards'
import { StockStatusChart } from '@/components/dashboards/stock-status-chart'
import { SlowMoversTable } from '@/components/dashboards/slow-movers-table'
import { FastMoversTable } from '@/components/dashboards/fast-movers-table'

export const metadata: Metadata = { title: 'Inventory Analytics' }

export default async function InventoryAnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const currency = organization.currency || 'KES'

  const [inventoryData] = await Promise.all([
    getInventoryDashboardData().catch(() => ({
      inventoryValue: { value: 0, units: 0 },
      stockStatus: { inStock: 0, lowStock: 0, outOfStock: 0 },
      slowMovers: [],
      fastMovers: []
    }))
  ])

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        icon={Package}
        title="Inventory Analytics"
        description="Track inventory value, stock status, slow movers, and fast movers."
        action={<div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dce3] bg-white px-3 text-sm font-semibold text-[#344054]"><AlertTriangle className="h-4 w-4" /><span>Real-time</span></div>}
      />

      {/* Inventory Metrics */}
      <section className="grid gap-4">
        <InventoryMetricsCards inventory={inventoryData.inventoryValue} currency={currency} />
      </section>

      {/* Stock Status */}
      <section className="grid gap-4">
        <StockStatusChart stockStatus={inventoryData.stockStatus} />
      </section>

      {/* Slow and Fast Movers */}
      <section className="grid gap-4 xl:grid-cols-2">
        <SlowMoversTable products={inventoryData.slowMovers} />
        <FastMoversTable products={inventoryData.fastMovers} />
      </section>
    </div>
  )
}
