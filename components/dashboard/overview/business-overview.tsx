import Link from 'next/link'
import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Building2,
  CreditCard,
  Package,
  PackageOpen,
  ReceiptText,
  Smartphone,
  ShoppingBag,
  UsersRound,
  BarChart3,
  Banknote,
  Landmark,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { WorkspaceConfig } from '@/lib/types/workspace'
import type { DashboardOverview } from '@/lib/services/dashboard-overview-service'
import { OperatingChart } from './operating-chart'
import { getBusinessExperience } from '@/lib/workspace/business-experience'
import { DashboardInsightCharts } from './dashboard-insight-charts'
import { BusiestHoursCard } from './busiest-hours-card'
import { TopSellingProductsCard } from './top-selling-products-card'
import { ComplianceStatusCard } from './compliance-status-card'
import { MetricCard, type MetricTrend } from './metric-card'
import { TimeGreeting } from '../time-greeting'
import { PermissionEnum, RoleEnum } from '@/lib/types/permissions'
import { isPharmacyBusiness } from '@/lib/pharmacy/rules'

interface BusinessOverviewProps {
  organizationName: string
  userName?: string | null
  timeZone: string
  currency: string
  overview: DashboardOverview
  workspaceConfig: WorkspaceConfig
  generatedAt: Date
  role: RoleEnum
  permissions: readonly PermissionEnum[]
}

// Shared visual tokens so every card/panel in this file stays pixel-consistent.
// These map onto the semantic CSS variables defined for .dashboard-shell in globals.css,
// so light and dark mode both stay correct without per-class overrides.
const PANEL = 'rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm'
const DIVIDER = 'border-[var(--dashboard-border)]'
const BRAND_ICON = 'border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]'
const TEXT = 'text-[var(--dashboard-text)]'
const MUTED = 'text-[var(--dashboard-muted)]'

function yesterdayTrend(current: number, previous: number): MetricTrend {
  if (previous <= 0) return { direction: 'neutral', text: 'No previous-day comparison' }
  const change = ((current - previous) / previous) * 100
  if (Math.abs(change) < 0.05) return { direction: 'neutral', text: 'No change vs yesterday' }
  return { direction: change > 0 ? 'up' : 'down', value: Math.abs(change), label: 'vs yesterday' }
}

function formatMetricCurrency(value: number, currency: string) {
  if (Math.abs(value) < 1_000_000) return formatCurrency(value, currency)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function BusinessOverview({ organizationName, userName, timeZone, currency, overview, workspaceConfig, generatedAt, role, permissions }: BusinessOverviewProps) {
  const experience = getBusinessExperience(workspaceConfig.businessType, workspaceConfig.businessCategory)
  const hasProducts = workspaceConfig.enabledModules.includes('products')
  const hasInventory = workspaceConfig.enabledModules.includes('inventory')
  const hasCustomers = workspaceConfig.enabledModules.includes('customers')
  const saleHref = workspaceConfig.enabledModules.includes('pos') ? '/dashboard/pos' : '/dashboard/sales'
  const availableActions = [
    ...((workspaceConfig.enabledModules.includes('pos') || workspaceConfig.enabledModules.includes('sales')) && permissions.includes(PermissionEnum.POS_VIEW) ? [{ id: 'primary', label: experience.actionLabels.primary, href: saleHref, icon: ShoppingBag, primary: true, description: 'Record a new sale' }] : []),
    ...(hasProducts && permissions.includes(PermissionEnum.PRODUCT_VIEW) ? [{ id: 'products', label: experience.actionLabels.products, href: '/dashboard/products', icon: Package, primary: false, description: 'Manage products' }] : []),
    ...(hasInventory && permissions.includes(PermissionEnum.INVENTORY_VIEW) ? [{ id: 'inventory', label: experience.actionLabels.inventory, href: '/dashboard/inventory', icon: Boxes, primary: false, description: 'Check stock levels' }] : []),
    ...(hasCustomers && permissions.includes(PermissionEnum.CUSTOMER_VIEW) ? [{ id: 'customers', label: 'Customers', href: '/dashboard/customers', icon: UsersRound, primary: false, description: 'Manage customers' }] : []),
    ...(workspaceConfig.enabledModules.includes('reports') && permissions.includes(PermissionEnum.REPORT_VIEW) ? [{ id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: BarChart3, primary: false, description: 'View insights' }] : []),
  ]
  const primaryAction = availableActions.find((action) => action.primary)
  const secondaryActions = availableActions.filter((action) => !action.primary)

  const todayProfit = overview.today.grossProfit
  const profitAvailable = todayProfit !== null
  const lowStockCount = Math.max(overview.records.lowStock - overview.records.outOfStock, 0)
  const metrics = [
    {
      label: "Today's Sales",
      value: formatCurrency(overview.today.revenue, currency),
      description: `${formatNumber(overview.today.transactions)} completed ${overview.today.transactions === 1 ? 'sale' : 'sales'}`,
      trend: yesterdayTrend(overview.today.revenue, overview.previousDay.revenue),
      icon: TrendingUp,
      href: '/dashboard/sales',
      linkLabel: 'View sales',
    },
    {
      label: "Today's Profit",
      value: profitAvailable ? formatCurrency(todayProfit, currency) : 'Unavailable',
      description: profitAvailable
        ? overview.today.profitMargin === null ? 'No sales to calculate margin' : `${overview.today.profitMargin.toFixed(1)}% gross margin`
        : 'Some sold products are missing cost',
      trend: profitAvailable && overview.previousDay.grossProfit !== null
        ? yesterdayTrend(todayProfit, overview.previousDay.grossProfit)
        : undefined,
      primaryMeta: profitAvailable ? undefined : 'Profit unavailable for incomplete cost data',
      icon: BadgeDollarSign,
      href: '/dashboard/sales',
      linkLabel: 'View sales',
    },
    {
      label: 'Stock Value',
      value: formatMetricCurrency(overview.records.inventoryCost, currency),
      description: 'Based on current buying cost',
      primaryMeta: `${formatNumber(overview.records.products)} products tracked`,
      icon: Boxes,
      href: '/dashboard/inventory',
      linkLabel: 'View inventory',
    },
    {
      label: 'Low Stock',
      value: `${formatNumber(overview.records.lowStock)} ${overview.records.lowStock === 1 ? 'product' : 'products'}`,
      description: overview.records.lowStock > 0
        ? `${formatNumber(lowStockCount)} low · ${formatNumber(overview.records.outOfStock)} critical`
        : 'No products need replenishing',
      status: overview.records.lowStock > 0 ? 'Reorder required' : 'All stock levels healthy',
      icon: TriangleAlert,
      href: '/dashboard/inventory',
      warning: overview.records.lowStock > 0,
      healthy: overview.records.lowStock === 0,
      linkLabel: 'Open inventory',
    },
  ]

  const updatedAt = generatedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
  const recentSalesTotal = overview.recentSales.reduce((sum, sale) => sum + sale.total, 0)

  return (
    <div className="dashboard-overview mx-auto w-full max-w-[1440px] space-y-4 pb-8">

      {/* ---------------------------------------------------------------- */}
      {/* Header                                                           */}
      {/* ---------------------------------------------------------------- */}
      <header className="dashboard-welcome relative overflow-hidden px-5 py-5 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="dashboard-live-status"><i /> Live overview</span>
              <span className="dashboard-updated">Updated {updatedAt}</span>
            </div>
            <p className="mt-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--dashboard-accent)]">
              {role === RoleEnum.MANAGER ? 'Manager · Branch overview' : role === RoleEnum.ADMIN ? 'Admin · Business overview' : 'Owner · Business overview'}
            </p>
            <h1 className="mt-1.5 text-[1.5rem] font-semibold leading-[1.2] tracking-[-0.025em] sm:text-[1.7rem]">
              <TimeGreeting name={userName} timeZone={timeZone} />
            </h1>
            <p className={cn('mt-2 max-w-lg text-sm leading-6', MUTED)}>
              {role === RoleEnum.MANAGER ? `Today's results and alerts for your assigned ${overview.records.branches === 1 ? 'branch' : 'branches'}.` : `Today's business summary for ${organizationName}.`}
            </p>
          </div>

          {/* Primary action stands alone; everything else lives in one quiet toolbar. */}
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            {primaryAction && (
              <Link
                href={primaryAction.href}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--dashboard-accent-cta)] px-4 text-sm font-semibold text-[var(--dashboard-accent-cta-ink)] shadow-[0_4px_10px_rgb(154_103_0_/_0.16)] outline-none transition-all hover:bg-[var(--dashboard-accent-cta-hover)] hover:shadow-[0_6px_14px_rgb(154_103_0_/_0.22)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-cta)] focus-visible:ring-offset-2"
              >
                <primaryAction.icon className="h-4 w-4" aria-hidden="true" />
                {primaryAction.label}
              </Link>
            )}

            {secondaryActions.length > 0 && (
              <div className={cn('flex items-center divide-x overflow-hidden rounded-lg border', DIVIDER, 'divide-[var(--dashboard-border)] bg-[var(--dashboard-surface)]')}>
                {secondaryActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className={cn('inline-flex h-10 items-center gap-2 px-3.5 text-sm font-medium outline-none transition-colors hover:bg-[var(--dashboard-surface-subtle)] focus-visible:relative focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dashboard-accent-cta)]', TEXT)}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden xl:inline">{action.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Metrics                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section aria-label="Today's operating metrics">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <MetricCard key={metric.label} title={metric.label} value={metric.value} icon={metric.icon} description={metric.description} href={metric.href} trend={metric.trend} primaryMeta={metric.primaryMeta} status={metric.status} warning={metric.warning} healthy={metric.healthy} linkLabel={metric.linkLabel} />)}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Insight charts                                                   */}
      {/* ---------------------------------------------------------------- */}
      <DashboardInsightCharts
        currency={currency}
        paymentMix={overview.paymentMix}
        salesPerformance={overview.salesPerformanceSeries}
        stock={{ healthy: overview.records.products - overview.records.lowStock, low: overview.records.lowStock - overview.records.outOfStock, out: overview.records.outOfStock }}
        productLabel={workspaceConfig.businessCategory === 'liquor_shop' ? 'drinks' : 'products'}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Liquor compliance                                                */}
      {/* ---------------------------------------------------------------- */}
      {workspaceConfig.businessCategory === 'liquor_shop' && (
        <section aria-label="Liquor-store controls">
          <ComplianceStatusCard verified={overview.liquorCompliance.verifiedToday} needsReview={overview.liquorCompliance.unverifiedToday} />
        </section>
      )}

      {isPharmacyBusiness(workspaceConfig.businessType, workspaceConfig.businessCategory) && (
        <section aria-label="Pharmacy stock controls" className={cn(PANEL, 'overflow-hidden')}>
          <div className={cn('flex items-center justify-between border-b px-5 py-4', DIVIDER)}><div><h2 className={cn('text-sm font-bold', TEXT)}>Batch and expiry attention</h2><p className={cn('mt-0.5 text-xs', MUTED)}>Actionable medicine stock risks from the inventory ledger.</p></div><Link href="/dashboard/inventory/batches" className={cn('text-xs font-semibold hover:underline', TEXT)}>Review batches</Link></div>
          <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0"><div className="p-4"><p className={cn('text-xs', MUTED)}>Expiring within 90 days</p><p className={cn('mt-1 text-xl font-bold tabular-nums', TEXT)}>{overview.pharmacyInventory.expiringSoon}</p></div><div className="p-4"><p className={cn('text-xs', MUTED)}>Expired batches</p><p className="mt-1 text-xl font-bold tabular-nums text-red-600">{overview.pharmacyInventory.expired}</p></div><div className="p-4"><p className={cn('text-xs', MUTED)}>Value at risk</p><p className={cn('mt-1 text-xl font-bold tabular-nums', TEXT)}>{formatCurrency(overview.pharmacyInventory.valueAtRisk, currency)}</p></div></div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Operating performance + month to date                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,.72fr)]">
        <OperatingChart data={overview.revenueSeries} currency={currency} />

        <BusiestHoursCard currency={currency} reportDate={overview.reportDate} sales={overview.hourlySales} />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Recent activity + stock                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className={cn('grid items-start gap-4', hasInventory && 'xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]')}>
        <article className={cn(PANEL, 'overflow-hidden')}>
          <div className={cn('flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between', DIVIDER)}>
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', BRAND_ICON)}>
                <ReceiptText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className={cn('text-[0.95rem] font-bold tracking-tight', TEXT)}>{experience.activityTitle}</h2>
                <p className={cn('mt-0.5 truncate text-xs', MUTED)}>Latest completed sales and payment details.</p>
              </div>
            </div>
            <Link href="/dashboard/sales" className={cn('inline-flex h-8 w-fit shrink-0 items-center gap-1.5 rounded-lg border bg-[var(--dashboard-surface)] px-3 text-xs font-semibold transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-soft-border)]', DIVIDER, TEXT)}>
              View all sales <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          {overview.recentSales.length ? (
            <>
              <div className={cn('flex items-center justify-between gap-4 border-b bg-[var(--dashboard-surface-subtle)] px-5 py-2.5 text-xs', DIVIDER)}>
                <p className={MUTED}>Showing <span className={cn('font-semibold tabular-nums', TEXT)}>{formatNumber(overview.recentSales.length)}</span> latest sales</p>
                <p className={MUTED}>Shown total <span className={cn('ml-1 font-bold tabular-nums', TEXT)}>{formatCurrency(recentSalesTotal, currency)}</span></p>
              </div>

              <div className={cn('divide-y sm:hidden', DIVIDER)}>
                {overview.recentSales.map((record) => (
                  <div key={record.id} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--dashboard-surface-subtle)]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]">
                      <ReceiptText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-semibold', TEXT)}>{record.receiptNo}</p>
                      <p className={cn('mt-0.5 text-xs', MUTED)}>{record.createdAt.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn('text-sm font-bold tabular-nums', TEXT)}>{formatCurrency(record.total, currency)}</p>
                      <div className="mt-1 flex justify-end"><PaymentBadge method={record.paymentMethod} /></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className={cn('bg-[var(--dashboard-surface-subtle)] text-[0.62rem] uppercase tracking-[0.1em]', MUTED)}>
                    <tr>
                      <th className="px-5 py-2.5 font-semibold">Sale</th>
                      <th className="px-4 py-2.5 font-semibold">Date &amp; time</th>
                      <th className="px-4 py-2.5 font-semibold">Payment method</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--dashboard-border)]">
                    {overview.recentSales.map((record) => (
                      <tr key={record.id} className="group transition-colors hover:bg-[var(--dashboard-surface-subtle)]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] transition-colors group-hover:border-[var(--dashboard-accent-soft-border)] group-hover:text-[var(--dashboard-accent)]">
                              <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <span className={cn('font-semibold', TEXT)}>{record.receiptNo}</span>
                          </div>
                        </td>
                        <td className={cn('px-4 py-3 text-xs tabular-nums', MUTED)}>{record.createdAt.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3"><PaymentBadge method={record.paymentMethod} /></td>
                        <td className={cn('px-5 py-3 text-right font-bold tabular-nums', TEXT)}>{formatCurrency(record.total, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState message="No transactions yet" detail="Completed sales will appear here automatically." href={saleHref} action="Record the first sale" />
          )}
        </article>

        {hasInventory && (
          <aside className="h-full">
            <TopSellingProductsCard currency={currency} reportDate={overview.reportDate} sales={overview.productSales} />
          </aside>
        )}
      </section>
    </div>
  )
}

function PaymentBadge({ method }: { method: string }) {
  const normalized = method.toLowerCase().replace(/[_-]/g, ' ')
  if (normalized.includes('mpesa') || normalized.includes('m pesa')) {
    return <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--dashboard-success-soft-border)] bg-[var(--dashboard-success-soft)] px-2.5 text-[0.68rem] font-semibold text-[var(--dashboard-success)]" aria-label="Paid with M-Pesa"><Smartphone className="h-3 w-3" aria-hidden="true" />M-Pesa</span>
  }
  if (normalized.includes('card')) {
    return <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-2.5 text-[0.68rem] font-semibold text-[var(--dashboard-text)]" aria-label="Paid by card"><CreditCard className="h-3 w-3 text-[var(--dashboard-muted)]" aria-hidden="true" />Card</span>
  }
  if (normalized.includes('bank')) {
    return <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-2.5 text-[0.68rem] font-semibold text-[var(--dashboard-text)]"><Landmark className="h-3 w-3 text-[var(--dashboard-muted)]" aria-hidden="true" />Bank transfer</span>
  }
  return <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] px-2.5 text-[0.68rem] font-semibold text-[var(--dashboard-accent)]"><Banknote className="h-3 w-3" aria-hidden="true" />Cash</span>
}

function TodayRegisterCard({ currency, revenue, transactions, expenses, saleHref, embedded = false }: { currency: string; revenue: number; transactions: number; expenses: number; saleHref: string; embedded?: boolean }) {
  const averageSale = transactions ? revenue / transactions : 0
  return (
    <div className={cn(embedded ? '' : cn(PANEL, 'overflow-hidden'))}>
              <div className={cn('flex items-start justify-between gap-3 border-b px-5 py-3', DIVIDER)}>
        <div>
          <h2 className={cn('text-[0.95rem] font-bold', TEXT)}>Register summary</h2>
          <p className={cn('mt-0.5 text-xs', MUTED)}>Today&apos;s checkout activity.</p>
        </div>
      </div>

              <dl className={cn('grid grid-cols-2 divide-x border-b', DIVIDER)}>
        <div className="px-5 py-3">
          <dt className={cn('text-[0.66rem] font-medium uppercase tracking-[0.08em]', MUTED)}>Sales</dt>
          <dd className={cn('mt-1 text-lg font-bold tabular-nums', TEXT)}>{formatCurrency(revenue, currency)}</dd>
        </div>
        <div className="px-5 py-3">
          <dt className={cn('text-[0.66rem] font-medium uppercase tracking-[0.08em]', MUTED)}>Receipts</dt>
          <dd className={cn('mt-1 text-lg font-bold tabular-nums', TEXT)}>{formatNumber(transactions)}</dd>
        </div>
      </dl>

      <div className="space-y-1.5 px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className={MUTED}>Average transaction</span>
          <strong className={cn('tabular-nums', TEXT)}>{formatCurrency(averageSale, currency)}</strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={MUTED}>Expenses recorded</span>
          <strong className={cn('tabular-nums', TEXT)}>{formatCurrency(expenses, currency)}</strong>
        </div>
      </div>

      <div className={cn('grid grid-cols-2 gap-2 border-t bg-[var(--dashboard-surface-subtle)] p-2', DIVIDER)}>
        <Link href={saleHref} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--dashboard-accent-cta)] px-3 text-xs font-bold text-[var(--dashboard-accent-cta-ink)] transition-colors hover:bg-[var(--dashboard-accent-cta-hover)]">
          <ShoppingBag className="h-3.5 w-3.5" />Start sale
        </Link>
        <Link href="/dashboard/sales" className={cn('inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-[var(--dashboard-surface)] px-3 text-xs font-semibold transition-colors hover:bg-[var(--dashboard-surface-subtle)]', DIVIDER, TEXT)}>
          View receipts <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className={cn('text-sm', MUTED)}>{label}</dt>
      <dd className={cn('tabular-nums', TEXT, emphasis ? 'text-base font-bold' : 'text-sm font-semibold')}>{value}</dd>
    </div>
  )
}

function MiniRecord({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className={cn('border-r px-3 py-3.5 text-center transition-colors last:border-r-0 hover:bg-[var(--dashboard-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dashboard-accent-cta)]', DIVIDER)}>
      <span className={cn('block text-sm font-bold tabular-nums', TEXT)}>{value}</span>
      <span className={cn('mt-0.5 block text-[0.7rem]', MUTED)}>{label}</span>
    </Link>
  )
}

function SectionHeader({ title, description, href }: { title: string; description: string; href?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b px-6 py-4', DIVIDER)}>
      <div>
        <h2 className={cn('text-[0.95rem] font-bold', TEXT)}>{title}</h2>
        <p className={cn('mt-0.5 text-xs', MUTED)}>{description}</p>
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--dashboard-accent)] transition-colors hover:opacity-80">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

function EmptyState({ message, detail, href, action, icon = 'receipt' }: { message: string; detail: string; href: string; action: string; icon?: 'receipt' | 'stock' }) {
  const Icon = icon === 'stock' ? PackageOpen : ReceiptText
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
      <span className={cn('flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--dashboard-surface-subtle)]', MUTED)}>
        <Icon className="h-5 w-5" />
      </span>
      <p className={cn('mt-3 text-sm font-semibold', TEXT)}>{message}</p>
      <p className={cn('mt-1 max-w-xs text-xs leading-5', MUTED)}>{detail}</p>
      <Link href={href} className="mt-4 text-xs font-semibold text-[var(--dashboard-accent)] hover:opacity-80">{action}</Link>
    </div>
  )
}
