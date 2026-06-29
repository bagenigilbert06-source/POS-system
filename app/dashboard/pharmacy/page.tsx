/**
 * Pharmacy Dashboard
 * Business-specific dashboard for Pharmacies
 * Features: Expiry tracking, prescriptions, low stock, batch tracking
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Pill, AlertTriangle, FileCheck, TrendingUp } from 'lucide-react';
import {
  DashboardPage,
  DashboardGrid,
  GridItem,
  DashboardSection,
  StatCard,
  AlertList,
} from '@/components/dashboard/shared';
import { getDashboardStats, getLowStockProducts } from '@/app/actions/dashboard';
import { formatCurrency } from '@/lib/utils/format';

export const metadata: Metadata = {
  title: 'Pharmacy Dashboard',
  description: 'Manage your pharmacy operations',
};

function StatsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

async function PharmacyStats() {
  const stats = await getDashboardStats('org-id');

  return (
    <DashboardGrid gap="md">
      <GridItem span={1}>
        <StatCard
          title="Daily Sales"
          value={stats.todaysSales}
          format="currency"
          icon={<TrendingUp className="h-6 w-6" />}
          iconBg="bg-green-100"
          trend={{
            value: 10,
            direction: 'up',
            label: 'vs yesterday',
          }}
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
          trend={{
            value: -1,
            direction: 'down',
            label: 'last 7 days',
          }}
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
  );
}

function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/sales"
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
      >
        <Pill className="h-4 w-4" />
        New Sale
      </Link>
      <Link
        href="/prescriptions"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <FileCheck className="h-4 w-4" />
        Manage Prescriptions
      </Link>
      <Link
        href="/inventory"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <AlertTriangle className="h-4 w-4" />
        Inventory
      </Link>
    </div>
  );
}

async function ExpiryAlertsSection() {
  // Mock data - replace with actual data fetching
  const expiryAlerts = [
    {
      id: '1',
      type: 'warning' as const,
      title: 'Paracetamol 500mg',
      message: 'Expires in 7 days (30 units)',
    },
    {
      id: '2',
      type: 'warning' as const,
      title: 'Ibuprofen 200mg',
      message: 'Expires in 14 days (50 units)',
    },
    {
      id: '3',
      type: 'error' as const,
      title: 'Amoxicillin 250mg',
      message: 'Expired 3 days ago (Remove from shelf)',
    },
  ];

  return <AlertList alerts={expiryAlerts} maxItems={5} title="Expiry Tracking" />;
}

async function LowStockSection() {
  const lowStockProducts = await getLowStockProducts('org-id');

  const alerts = lowStockProducts.map((product) => ({
    id: product.id,
    type: 'warning' as const,
    title: product.name,
    message: `Only ${product.stock} units left (min: ${product.minStock})`,
    dismissible: false,
  }));

  return <AlertList alerts={alerts} maxItems={5} title="Low Stock Medicines" />;
}

async function PendingPrescriptionsSection() {
  // Mock data
  const prescriptions = [
    { id: '1', customerName: 'John Doe', medicines: 3, status: 'pending', dateAdded: '2h ago' },
    { id: '2', customerName: 'Jane Smith', medicines: 2, status: 'pending', dateAdded: '30m ago' },
    { id: '3', customerName: 'Bob Wilson', medicines: 4, status: 'pending', dateAdded: '15m ago' },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">Pending Prescriptions</h3>
      {prescriptions.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No pending prescriptions</p>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((prescription) => (
            <div key={prescription.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{prescription.customerName}</p>
                <p className="text-sm text-gray-600">{prescription.medicines} medicine items</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{prescription.dateAdded}</p>
                <button className="mt-1 inline-flex items-center rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200">
                  Dispense
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function BatchTrackingSection() {
  // Mock data
  const batches = [
    { id: '1', product: 'Paracetamol', batchNo: 'PAR-2024-001', expiryDays: 7, quantity: 100 },
    { id: '2', product: 'Ibuprofen', batchNo: 'IBU-2024-015', expiryDays: 30, quantity: 150 },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">Batch Tracking</h3>
      <div className="space-y-3">
        {batches.map((batch) => (
          <div key={batch.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <p className="font-medium text-gray-900">{batch.product}</p>
              <p className="text-sm text-gray-600">Batch: {batch.batchNo}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{batch.quantity} units</p>
              <p className={`text-xs font-medium ${batch.expiryDays < 30 ? 'text-orange-600' : 'text-gray-500'}`}>
                Expires in {batch.expiryDays}d
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PharmacyDashboard() {
  return (
    <DashboardPage
      title="Pharmacy Dashboard"
      description="Manage your pharmacy operations and track inventory"
      action={<QuickActions />}
    >
      {/* Main Stats */}
      <DashboardSection title="Key Metrics" description="Current pharmacy status">
        <Suspense fallback={<StatsSkeleton />}>
          <PharmacyStats />
        </Suspense>
      </DashboardSection>

      {/* Alerts Grid */}
      <DashboardGrid gap="md" className="mt-6">
        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
            <ExpiryAlertsSection />
          </Suspense>
        </GridItem>

        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
            <LowStockSection />
          </Suspense>
        </GridItem>
      </DashboardGrid>

      {/* Lower Grid */}
      <DashboardGrid gap="md" className="mt-6">
        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
            <PendingPrescriptionsSection />
          </Suspense>
        </GridItem>

        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
            <BatchTrackingSection />
          </Suspense>
        </GridItem>
      </DashboardGrid>
    </DashboardPage>
  );
}
