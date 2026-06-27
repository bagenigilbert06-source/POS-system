import { getDashboardStats } from '@/app/actions/sales'
import { MetricCard } from '@/components/dashboard/metric-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { LowStockAlert } from '@/components/dashboard/low-stock-alert'
import { RecentSales } from '@/components/dashboard/recent-sales'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const quickActions = [
    { label: 'New Sale', href: '/dashboard/pos', color: 'bg-primary text-primary-foreground hover:bg-primary/90' },
    { label: 'Add Product', href: '/dashboard/products', color: 'bg-secondary text-secondary-foreground hover:bg-secondary/80' },
    { label: 'Add Customer', href: '/dashboard/customers', color: 'bg-secondary text-secondary-foreground hover:bg-secondary/80' },
    { label: 'View Reports', href: '/dashboard/reports', color: 'bg-secondary text-secondary-foreground hover:bg-secondary/80' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back — here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${action.color}`}
          >
            {action.label}
          </Link>
        ))}
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today&apos;s Revenue"
          value={formatCurrency(stats.todayRevenue)}
          subtitle={`${stats.todaySalesCount} transactions today`}
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthRevenue)}
          subtitle={`${stats.monthSalesCount} transactions this month`}
          icon={Calendar}
        />
        <MetricCard
          title="Total Products"
          value={stats.productCount.toString()}
          subtitle="In your catalog"
          icon={Package}
        />
        <MetricCard
          title="Low Stock Items"
          value={stats.lowStockCount.toString()}
          subtitle="Require restocking"
          icon={AlertTriangle}
          variant={stats.lowStockCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Revenue chart */}
      <RevenueChart data={stats.weeklyRevenue} />

      {/* Bottom grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentSales sales={stats.recentSales} />
        <LowStockAlert products={stats.lowStockProducts} />
      </div>

      {/* Quick POS shortcut */}
      <div className="rounded-lg border bg-[hsl(var(--sidebar-bg))] p-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">POS Terminal</h3>
          <p className="text-sm text-[hsl(var(--sidebar-fg))] mt-0.5">
            Open the point-of-sale terminal to process sales with cash or M-Pesa.
          </p>
        </div>
        <Link
          href="/dashboard/pos"
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0 ml-4"
        >
          <ShoppingCart className="h-4 w-4" />
          Open POS
        </Link>
      </div>
    </div>
  )
}
