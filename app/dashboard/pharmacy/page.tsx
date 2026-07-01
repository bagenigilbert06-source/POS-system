/**
 * Pharmacy Dashboard
 *
 * One dashboard for ALL pharmacy categories (community, hospital, chemist, other).
 * The template drives quick actions and getting-started tasks.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Pill, AlertTriangle, FileCheck, TrendingUp } from 'lucide-react'
import {
  DashboardPage,
  DashboardGrid,
  GridItem,
  DashboardSection,
  StatCard,
  AlertList,
} from '@/components/dashboard/shared'
import { getDashboardStats, getLowStockProducts } from '@/app/actions/dashboard'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { BosCommandCenter } from '@/components/dashboard/bos-command-center'

export const metadata: Metadata = {
  title: 'Dashboard — Pharmacy',
  description: 'Manage your pharmacy operations',
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

async function PharmacyStats({ orgId }: { orgId: string }) {
  const stats = await getDashboardStats(orgId)
  return (
    <DashboardGrid gap="md">
      <GridItem span={1}>
        <StatCard
          title="Daily Sales"
          value={stats.todaysSales}
          format="currency"
          icon={<TrendingUp className="h-6 w-6" />}
          iconBg="bg-green-100"
          trend={{ value: 10, direction: 'up', label: 'vs yesterday' }}
        />
      </GridItem>
      <GridItem span={1}>
        <StatCard
          title="Low Stock Items"
          value={5}
          format="number"
          icon={<AlertTriangle className="h-6 w-6" />}
          iconBg="bg-red-100"
        />
      </GridItem>
      <GridItem span={1}>
        <StatCard
          title="Expiring Soon"
          value={2}
          format="number"
          icon={<Pill className="h-6 w-6" />}
          iconBg="bg-orange-100"
          trend={{ value: -1, direction: 'down', label: 'last 7 days' }}
        />
      </GridItem>
      <GridItem span={1}>
        <StatCard
          title="Pending Prescriptions"
          value={3}
          format="number"
          icon={<FileCheck className="h-6 w-6" />}
          iconBg="bg-blue-100"
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
  return <AlertList alerts={alerts} maxItems={5} title="Low Stock Medicines" />
}

function ExpiryAlerts() {
  const alerts = [
    { id: '1', type: 'warning' as const, title: 'Paracetamol 500mg', message: 'Expires in 7 days (30 units)' },
    { id: '2', type: 'warning' as const, title: 'Ibuprofen 200mg', message: 'Expires in 14 days (50 units)' },
    { id: '3', type: 'error' as const, title: 'Amoxicillin 250mg', message: 'Expired 3 days ago — remove from shelf' },
  ]
  return <AlertList alerts={alerts} maxItems={5} title="Expiry Tracking" />
}

function PendingPrescriptions() {
  const prescriptions = [
    { id: '1', customerName: 'John Doe', medicines: 3, dateAdded: '2h ago' },
    { id: '2', customerName: 'Jane Smith', medicines: 2, dateAdded: '30m ago' },
    { id: '3', customerName: 'Bob Wilson', medicines: 4, dateAdded: '15m ago' },
  ]
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-card-foreground">Pending Prescriptions</h3>
      <div className="space-y-3">
        {prescriptions.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="font-medium text-card-foreground">{p.customerName}</p>
              <p className="text-sm text-muted-foreground">{p.medicines} medicine items</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{p.dateAdded}</p>
              <button className="mt-1 inline-flex items-center rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20">
                Dispense
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function PharmacyDashboard() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const workspaceConfig = WorkspaceService.createWorkspaceConfig(
    organization.id,
    organization.businessType ?? 'pharmacy',
    organization.businessCategory ?? 'community_pharmacy'
  )

  return (
    <DashboardPage
      title={`${organization.name} Dashboard`}
      description="Manage your pharmacy operations and track inventory"
    >
      <DashboardSection title="Key Metrics" description="Current pharmacy status">
        <Suspense fallback={<StatsSkeleton />}>
          <PharmacyStats orgId={organization.id} />
        </Suspense>
      </DashboardSection>

      <BosCommandCenter workspaceConfig={workspaceConfig} />

      <DashboardGrid gap="md" className="mt-6">
        <GridItem span={2}>
          <ExpiryAlerts />
        </GridItem>
        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-muted" />}>
            <LowStockSection orgId={organization.id} />
          </Suspense>
        </GridItem>
      </DashboardGrid>

      <DashboardGrid gap="md" className="mt-6">
        <GridItem span={2}>
          <PendingPrescriptions />
        </GridItem>
      </DashboardGrid>
    </DashboardPage>
  )
}
