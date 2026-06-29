/**
 * Restaurant Dashboard
 * Business-specific dashboard for Restaurants & Cafés
 * Features: Table management, kitchen queue, orders, revenue
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { UtensilsCrossed, Clock, Users, TrendingUp } from 'lucide-react';
import {
  DashboardPage,
  DashboardGrid,
  GridItem,
  DashboardSection,
  StatCard,
  AlertList,
} from '@/components/dashboard/shared';
import { getDashboardStats } from '@/app/actions/dashboard';
import { formatCurrency } from '@/lib/utils/format';

export const metadata: Metadata = {
  title: 'Restaurant Dashboard',
  description: 'Manage your restaurant operations',
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

async function RestaurantStats() {
  const stats = await getDashboardStats('org-id');

  return (
    <DashboardGrid gap="md">
      <GridItem span={1}>
        <StatCard
          title="Active Tables"
          value={12}
          format="number"
          icon={<UtensilsCrossed className="h-6 w-6" />}
          iconBg="bg-orange-100"
          trend={{
            value: 3,
            direction: 'up',
            label: 'vs 1h ago',
          }}
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
          trend={{
            value: 15,
            direction: 'up',
            label: 'vs yesterday',
          }}
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
  );
}

function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/orders"
        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
      >
        <Clock className="h-4 w-4" />
        New Order
      </Link>
      <Link
        href="/kitchen"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <UtensilsCrossed className="h-4 w-4" />
        Kitchen Queue
      </Link>
      <Link
        href="/tables"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Users className="h-4 w-4" />
        Manage Tables
      </Link>
    </div>
  );
}

async function KitchenQueueSection() {
  // Mock data - replace with actual data fetching
  const kitchenOrders = [
    { id: '1', tableNumber: 5, items: 'Pasta, Salad', time: '8m', status: 'cooking' },
    { id: '2', tableNumber: 3, items: 'Steak', time: '5m', status: 'ready' },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">Kitchen Queue</h3>
      {kitchenOrders.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No orders</p>
      ) : (
        <div className="space-y-3">
          {kitchenOrders.map((order) => (
            <div
              key={order.id}
              className={`flex items-center justify-between rounded-lg p-3 ${
                order.status === 'ready'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <div>
                <p className="font-medium text-gray-900">Table {order.tableNumber}</p>
                <p className="text-sm text-gray-600">{order.items}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{order.time}</p>
                <p className={`text-xs font-medium capitalize ${
                  order.status === 'ready' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {order.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function TableStatusSection() {
  // Mock data
  const tables = [
    { number: 1, status: 'available' },
    { number: 2, status: 'occupied' },
    { number: 3, status: 'occupied' },
    { number: 4, status: 'available' },
    { number: 5, status: 'occupied' },
    { number: 6, status: 'dirty' },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">Table Status</h3>
      <div className="grid grid-cols-3 gap-3">
        {tables.map((table) => {
          const statusColors = {
            available: 'bg-green-100 text-green-800',
            occupied: 'bg-blue-100 text-blue-800',
            dirty: 'bg-gray-100 text-gray-800',
          };

          return (
            <button
              key={table.number}
              className={`rounded-lg p-4 text-center font-semibold transition-all hover:shadow-md ${
                statusColors[table.status as keyof typeof statusColors]
              }`}
            >
              Table {table.number}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RestaurantDashboard() {
  return (
    <DashboardPage
      title="Restaurant Dashboard"
      description="Manage your restaurant operations and track orders"
      action={<QuickActions />}
    >
      {/* Main Stats */}
      <DashboardSection title="Key Metrics" description="Current service status">
        <Suspense fallback={<StatsSkeleton />}>
          <RestaurantStats />
        </Suspense>
      </DashboardSection>

      {/* Operations Grid */}
      <DashboardGrid gap="md" className="mt-6">
        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
            <KitchenQueueSection />
          </Suspense>
        </GridItem>

        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
            <TableStatusSection />
          </Suspense>
        </GridItem>
      </DashboardGrid>
    </DashboardPage>
  );
}
