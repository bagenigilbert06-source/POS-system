/**
 * Retail Dashboard
 *
 * One dashboard for ALL retail categories.
 * The template (loaded from WorkspaceConfig) drives:
 *   - Quick actions
 *   - Getting-started checklist
 *   - Widget configuration
 *
 * No per-category if/else.  Adding a new retail category = create a template
 * file in lib/templates/retail/ and register it in lib/templates/index.ts.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { ShoppingCart, Package, PackageSearch, TrendingUp } from 'lucide-react'
import {
  DashboardPage,
  DashboardGrid,
  GridItem,
  DashboardSection,
  StatCard,
  AlertList,
} from '@/components/dashboard/shared'
import { getDashboardStats, getTopProducts, getLowStockProducts } from '@/app/actions/dashboard'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { BosCommandCenter } from '@/components/dashboard/bos-command-center'

export const metadata: Metadata = {
  title: 'Dashboard — Retail',
  description: 'Manage your retail store operations',
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  )
}

async function RetailStats({ orgId }: { orgId: string }) {
  const stats = await getDashboardStats(orgId)

  return (
    <DashboardGrid gap="md">
      <GridItem span={1}>
        <StatCard
          title="Today Revenue"
          value={stats.todaysSales}
          format="currency"
          icon={<TrendingUp className="h-6 w-6" />}
          iconBg="bg-green-100"
          trend={{ value: 12, direction: 'up', label: 'vs yesterday' }}
        />
      </GridItem>
      <GridItem span={1}>
        <StatCard
          title="Transactions"
          value={stats.todaysTransactions}
          format="number"
          icon={<ShoppingCart className="h-6 w-6" />}
          iconBg="bg-blue-100"
          trend={{ value: 8, direction: 'up', label: 'today' }}
        />
      </GridItem>
      <GridItem span={1}>
        <StatCard
          title="Avg Order Value"
          value={stats.averageOrderValue}
          format="currency"
          icon={<Package className="h-6 w-6" />}
          iconBg="bg-purple-100"
        />
      </GridItem>
      <GridItem span={1}>
        <StatCard
          title="Profit"
          value={stats.todaysProfit}
          format="currency"
          icon={<TrendingUp className="h-6 w-6" />}
          iconBg="bg-emerald-100"
          trend={{ value: 18, direction: 'up', label: 'this month' }}
        />
      </GridItem>
    </DashboardGrid>
  )
}

async function LowStockSection({ orgId }: { orgId: string }) {
  const items = await getLowStockProducts(orgId)
  const alerts = items.map((p) => ({
    id: p.id,
    type: 'warning' as const,
    title: p.name,
    message: `Only ${p.stock} units left (min: ${p.minStock})`,
    dismissible: false,
  }))
  return <AlertList alerts={alerts} maxItems={5} title="Low Stock Alerts" />
}

async function TopProductsSection({ orgId }: { orgId: string }) {
  const products = await getTopProducts(orgId, 5)
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-card-foreground">Top Products</h3>
      {products.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No sales data yet</p>
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => (
            <div key={product.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-card-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{product.stock} in stock</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function RetailDashboard() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  // Load the workspace config to get the template-driven quick actions
  const workspaceConfig = WorkspaceService.createWorkspaceConfig(
    organization.id,
    organization.businessType ?? 'retail',
    organization.businessCategory ?? 'other_retail'
  )

  return (
    <DashboardPage
      title={`${organization.name} Dashboard`}
      description="Manage your retail store operations and track performance"
    >
      <DashboardSection title="Key Metrics" description="Today's performance">
        <Suspense fallback={<StatsSkeleton />}>
          <RetailStats orgId={organization.id} />
        </Suspense>
      </DashboardSection>

      <BosCommandCenter workspaceConfig={workspaceConfig} />

      <DashboardGrid gap="md" className="mt-6">
        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-muted" />}>
            <LowStockSection orgId={organization.id} />
          </Suspense>
        </GridItem>
        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-muted" />}>
            <TopProductsSection orgId={organization.id} />
          </Suspense>
        </GridItem>
      </DashboardGrid>
    </DashboardPage>
  )
}
