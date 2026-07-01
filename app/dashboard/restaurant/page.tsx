/**
 * Restaurant Dashboard
 *
 * One dashboard for ALL restaurant categories (restaurant, café, bakery,
 * fast food, bar/lounge, coffee shop, other).
 * The template drives quick actions and getting-started tasks.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { UtensilsCrossed, Clock, Users, TrendingUp } from 'lucide-react'
import {
  DashboardPage,
  DashboardGrid,
  GridItem,
  DashboardSection,
  StatCard,
} from '@/components/dashboard/shared'
import { getDashboardStats } from '@/app/actions/dashboard'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { BosCommandCenter } from '@/components/dashboard/bos-command-center'

export const metadata: Metadata = {
  title: 'Dashboard — Restaurant',
  description: 'Manage your restaurant operations',
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

async function RestaurantStats({ orgId }: { orgId: string }) {
  const stats = await getDashboardStats(orgId)
  return (
    <DashboardGrid gap="md">
      <GridItem span={1}>
        <StatCard
          title="Active Tables"
          value={12}
          format="number"
          icon={<UtensilsCrossed className="h-6 w-6" />}
          iconBg="bg-orange-100"
          trend={{ value: 3, direction: 'up', label: 'vs 1h ago' }}
        />
      </GridItem>
      <GridItem span={1}>
        <StatCard
          title="Pending Orders"
          value={8}
          format="number"
          icon={<Clock className="h-6 w-6" />}
          iconBg="bg-red-100"
        />
      </GridItem>
      <GridItem span={1}>
        <StatCard
          title="Daily Revenue"
          value={stats.todaysSales}
          format="currency"
          icon={<TrendingUp className="h-6 w-6" />}
          iconBg="bg-green-100"
          trend={{ value: 15, direction: 'up', label: 'vs yesterday' }}
        />
      </GridItem>
      <GridItem span={1}>
        <StatCard
          title="Avg Order Value"
          value={stats.averageOrderValue}
          format="currency"
          icon={<Users className="h-6 w-6" />}
          iconBg="bg-blue-100"
        />
      </GridItem>
    </DashboardGrid>
  )
}

function KitchenQueue() {
  const orders = [
    { id: '1', tableNumber: 5, items: 'Pasta, Salad', time: '8m', status: 'cooking' },
    { id: '2', tableNumber: 3, items: 'Steak', time: '5m', status: 'ready' },
  ]
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-card-foreground">Kitchen Queue</h3>
      <div className="space-y-3">
        {orders.map((o) => (
          <div
            key={o.id}
            className={`flex items-center justify-between rounded-lg p-3 ${
              o.status === 'ready'
                ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800'
            }`}
          >
            <div>
              <p className="font-medium text-card-foreground">Table {o.tableNumber}</p>
              <p className="text-sm text-muted-foreground">{o.items}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{o.time}</p>
              <p className={`text-xs font-medium capitalize ${o.status === 'ready' ? 'text-green-600' : 'text-orange-600'}`}>
                {o.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TableStatus() {
  const tables = [
    { number: 1, status: 'available' },
    { number: 2, status: 'occupied' },
    { number: 3, status: 'occupied' },
    { number: 4, status: 'available' },
    { number: 5, status: 'occupied' },
    { number: 6, status: 'dirty' },
  ]
  const colors: Record<string, string> = {
    available: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    occupied: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    dirty: 'bg-muted text-muted-foreground',
  }
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-card-foreground">Table Status</h3>
      <div className="grid grid-cols-3 gap-3">
        {tables.map((t) => (
          <button key={t.number} className={`rounded-lg p-4 text-center font-semibold transition-all hover:shadow-md ${colors[t.status] ?? ''}`}>
            Table {t.number}
          </button>
        ))}
      </div>
    </div>
  )
}

export default async function RestaurantDashboard() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const workspaceConfig = WorkspaceService.createWorkspaceConfig(
    organization.id,
    organization.businessType ?? 'restaurant',
    organization.businessCategory ?? 'restaurant'
  )

  return (
    <DashboardPage
      title={`${organization.name} Dashboard`}
      description="Manage your restaurant operations and track orders"
    >
      <DashboardSection title="Key Metrics" description="Current service status">
        <Suspense fallback={<StatsSkeleton />}>
          <RestaurantStats orgId={organization.id} />
        </Suspense>
      </DashboardSection>

      <BosCommandCenter workspaceConfig={workspaceConfig} />

      <DashboardGrid gap="md" className="mt-6">
        <GridItem span={2}>
          <KitchenQueue />
        </GridItem>
        <GridItem span={2}>
          <TableStatus />
        </GridItem>
      </DashboardGrid>
    </DashboardPage>
  )
}
