/**
 * Retail Dashboard
 * Business-specific dashboard for Retail stores
 * Features: Sales tracking, inventory, products, low stock alerts
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingCart, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  DashboardPage,
  DashboardGrid,
  GridItem,
  DashboardSection,
  StatCard,
  AlertList,
} from '@/components/dashboard/shared';
import { getDashboardStats, getTopProducts, getLowStockProducts } from '@/app/actions/dashboard';
import { formatCurrency, formatCompactNumber } from '@/lib/utils/format';

export const metadata: Metadata = {
  title: 'Retail Dashboard',
  description: 'Manage your retail store operations',
};

// Loading components
function StatsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

// Stats Component
async function RetailStats() {
  const stats = await getDashboardStats('org-id');

  return (
    <DashboardGrid gap="md">
      <GridItem span={1}>
        <StatCard
          title="Today Revenue"
          value={stats.todaysSales}
          format="currency"
          icon={<TrendingUp className="h-6 w-6" />}
          iconBg="bg-green-100"
          trend={{
            value: 12,
            direction: 'up',
            label: 'vs yesterday',
          }}
        />
      </GridItem>

      <GridItem span={1}>
        <StatCard
          title="Transactions"
          value={stats.todaysTransactions}
          format="number"
          icon={<ShoppingCart className="h-6 w-6" />}
          iconBg="bg-blue-100"
          trend={{
            value: 8,
            direction: 'up',
            label: 'today',
          }}
        />
      </GridItem>

      <GridItem span={1}>
        <StatCard
          title="Avg Order Value"
          value={stats.averageOrderValue}
          format="currency"
          icon={<Package className="h-6 w-6" />}
          iconBg="bg-purple-100"
          trend={{
            value: 5,
            direction: 'up',
            label: 'this month',
          }}
        />
      </GridItem>

      <GridItem span={1}>
        <StatCard
          title="Profit"
          value={stats.todaysProfit}
          format="currency"
          icon={<TrendingUp className="h-6 w-6" />}
          iconBg="bg-emerald-100"
          trend={{
            value: 18,
            direction: 'up',
            label: 'this month',
          }}
        />
      </GridItem>
    </DashboardGrid>
  );
}

// Quick Actions
function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/sales"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        <ShoppingCart className="h-4 w-4" />
        New Sale
      </Link>
      <Link
        href="/products"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Package className="h-4 w-4" />
        Add Product
      </Link>
      <Link
        href="/inventory"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <AlertTriangle className="h-4 w-4" />
        View Inventory
      </Link>
    </div>
  );
}

// Low Stock Alerts
async function LowStockAlertsSection() {
  const lowStockProducts = await getLowStockProducts('org-id');

  const alerts = lowStockProducts.map((product) => ({
    id: product.id,
    type: 'warning' as const,
    title: product.name,
    message: `Only ${product.stock} units left (min: ${product.minStock})`,
    dismissible: false,
  }));

  return (
    <AlertList alerts={alerts} maxItems={5} title="Low Stock Alerts" />
  );
}

// Top Products
async function TopProductsSection() {
  const topProducts = await getTopProducts('org-id', 5);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">Top Products</h3>
      {topProducts.length === 0 ? (
        <p className="text-center text-sm text-gray-500">No sales data yet</p>
      ) : (
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatCurrency(product.sellingPrice)}</p>
                <p className="text-xs text-gray-500">{product.stock} in stock</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RetailDashboard() {
  return (
    <DashboardPage
      title="Retail Dashboard"
      description="Manage your retail store operations and track performance"
      action={<QuickActions />}
    >
      {/* Main Stats */}
      <DashboardSection title="Key Metrics" description="Today performance">
        <Suspense fallback={<StatsSkeleton />}>
          <RetailStats />
        </Suspense>
      </DashboardSection>

      {/* Lower Grid */}
      <DashboardGrid gap="md" className="mt-6">
        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
            <LowStockAlertsSection />
          </Suspense>
        </GridItem>

        <GridItem span={2}>
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-gray-200" />}>
            <TopProductsSection />
          </Suspense>
        </GridItem>
      </DashboardGrid>
    </DashboardPage>
  );
}
