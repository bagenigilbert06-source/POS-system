import Link from 'next/link'
import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Building2,
  CircleAlert,
  CreditCard,
  Package,
  PackageOpen,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  TriangleAlert,
  ShieldCheck,
  UsersRound,
  BarChart3,
  Banknote,
  Landmark,
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { WorkspaceConfig } from '@/lib/types/workspace'
import type { DashboardOverview } from '@/lib/services/dashboard-overview-service'
import { OperatingChart } from './operating-chart'
import { getBusinessExperience } from '@/lib/workspace/business-experience'
import { DashboardInsightCharts } from './dashboard-insight-charts'
import { TimeGreeting } from '../time-greeting'
import { PermissionEnum, RoleEnum } from '@/lib/types/permissions'

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
const ALERT_ICON = 'border-[var(--dashboard-danger-soft-border)] bg-[var(--dashboard-danger-soft)] text-[var(--dashboard-danger)]'
const BRAND_ICON = 'border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]'
const TEXT = 'text-[var(--dashboard-text)]'
const MUTED = 'text-[var(--dashboard-muted)]'

function methodLabel(method: string) {
  return method.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
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

  const transactionAverage = overview.today.transactions ? overview.today.revenue / overview.today.transactions : 0
  const commerceMetrics = experience.kind === 'retail' || experience.kind === 'hospitality'
  const metrics = [
    { label: experience.metricLabels[0], value: formatCurrency(overview.today.revenue, currency), detail: `${formatNumber(overview.today.transactions)} completed`, meta: 'Gross sales recorded today', context: 'Today', icon: TrendingUp, href: '/dashboard/sales' },
    commerceMetrics
      ? { label: experience.metricLabels[1], value: formatNumber(overview.today.transactions), detail: experience.kind === 'hospitality' ? 'Completed counter orders' : 'Completed sales', meta: `${formatCurrency(overview.today.revenue, currency)} processed`, context: 'Today', icon: ReceiptText, href: '/dashboard/sales' }
      : { label: experience.metricLabels[1], value: formatCurrency(overview.today.expenses, currency), detail: 'Recorded today', meta: 'Operating costs logged', context: 'Today', icon: CreditCard, href: '/dashboard/expenses' },
    commerceMetrics
      ? { label: experience.metricLabels[2], value: formatCurrency(transactionAverage, currency), detail: experience.kind === 'hospitality' ? 'Per completed order' : 'Per completed sale', meta: `${formatNumber(overview.today.transactions)} transactions`, context: 'Average', icon: BadgeDollarSign, href: '/dashboard/sales' }
      : { label: experience.metricLabels[2], value: formatCurrency(overview.today.operatingPosition, currency), detail: 'Sales less expenses', meta: 'Net operating position', context: 'Today', icon: BadgeDollarSign, href: '/dashboard/reports' },
    ...(hasInventory && commerceMetrics
      ? experience.kind === 'hospitality'
        ? [{ label: experience.metricLabels[3], value: formatNumber(overview.records.products), detail: 'Available menu items', icon: Package, href: '/dashboard/products' }]
        : [{ label: experience.metricLabels[3], value: formatNumber(overview.records.lowStock), detail: `${overview.records.outOfStock} out of stock`, meta: `${formatNumber(overview.records.products)} products tracked`, context: overview.records.lowStock > 0 ? 'Needs attention' : 'All stocked', icon: TriangleAlert, href: '/dashboard/inventory', alert: overview.records.lowStock > 0 }]
      : hasInventory ? [{ label: 'Stock alerts', value: formatNumber(overview.records.lowStock), detail: `${overview.records.outOfStock} out of stock`, meta: `${formatNumber(overview.records.products)} products tracked`, context: overview.records.lowStock > 0 ? 'Needs attention' : 'All stocked', icon: TriangleAlert, href: '/dashboard/inventory', alert: overview.records.lowStock > 0 }] : []),
    ...(!hasInventory && hasCustomers ? [{ label: 'Customer records', value: formatNumber(overview.records.customers), detail: 'Available in this workspace', icon: UsersRound }] : []),
    ...(!hasInventory && !hasCustomers ? [{ label: 'Locations', value: formatNumber(overview.records.branches), detail: 'Active business locations', icon: Building2 }] : []),
  ]

  const updatedAt = generatedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })

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
              {role === RoleEnum.MANAGER ? 'Manager · Branch operations' : role === RoleEnum.ADMIN ? 'Admin · Organization overview' : 'Owner · Organization overview'}
            </p>
            <h1 className="mt-1.5 text-[1.7rem] font-bold leading-tight tracking-tight sm:text-[1.95rem]">
              <TimeGreeting name={userName} timeZone={timeZone} />
            </h1>
            <p className={cn('mt-2 max-w-lg text-sm leading-6', MUTED)}>
              {role === RoleEnum.MANAGER ? `Today's performance and attention items for your assigned ${overview.records.branches === 1 ? 'branch' : 'branches'}.` : `Today's organization-wide overview for ${organizationName}.`}
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
          {metrics.map((metric) => {
            const Icon = metric.icon
            const isAlert = 'alert' in metric && metric.alert
            const metricTone = isAlert ? 'metric-alert' : 'metric-positive'
            const card = (
              <div className={cn('dashboard-metric-card', metricTone, PANEL, 'group relative flex h-full min-h-[148px] flex-col overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(15_23_42_/_0.08)]')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className={cn('truncate text-[0.67rem] font-bold uppercase tracking-[0.1em]', MUTED)}>{metric.label}</p>
                    {metric.context && (
                      <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[0.58rem] font-medium normal-case tracking-normal', isAlert ? 'bg-[var(--dashboard-danger-soft)] text-[var(--dashboard-danger)]' : 'bg-[var(--dashboard-success-soft)] text-[var(--dashboard-success)]')}>
                        {metric.context}
                      </span>
                    )}
                  </div>
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover:scale-105', isAlert ? ALERT_ICON : BRAND_ICON)}>
                    <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                </div>

                <p className={cn('mt-4 truncate text-[1.6rem] font-bold leading-none tabular-nums tracking-[-0.035em]', isAlert ? 'text-[var(--dashboard-danger)]' : TEXT)}>{metric.value}</p>
                <p className={cn('mt-1.5 text-[0.72rem]', MUTED)}>{metric.detail}</p>

                {metric.href && (
                  <div className="mt-2.5 flex items-center justify-between gap-3 pt-1">
                    <span className={cn('truncate text-[0.68rem]', MUTED)}>{metric.meta}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[0.68rem] font-bold text-[var(--dashboard-accent)]">
                      View details <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                )}
              </div>
            )
            return metric.href ? (
              <Link key={metric.label} href={metric.href} className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-cta)] focus-visible:ring-offset-2">
                {card}
              </Link>
            ) : (
              <article key={metric.label} className="h-full">{card}</article>
            )
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Insight charts                                                   */}
      {/* ---------------------------------------------------------------- */}
      <DashboardInsightCharts
        currency={currency}
        paymentMix={overview.paymentMix}
        topProducts={overview.topProducts}
        stock={{ healthy: overview.records.products - overview.records.lowStock, low: overview.records.lowStock - overview.records.outOfStock, out: overview.records.outOfStock }}
        productLabel={workspaceConfig.businessCategory === 'liquor_shop' ? 'drinks' : 'products'}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Liquor compliance                                                */}
      {/* ---------------------------------------------------------------- */}
      {workspaceConfig.businessCategory === 'liquor_shop' && (
        <section aria-label="Liquor-store controls">
          <article className={cn(PANEL, 'flex flex-col gap-4 p-4 lg:flex-row lg:items-center')}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', BRAND_ICON)}>
                <ShieldCheck className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className={cn('text-[0.82rem] font-bold', TEXT)}>Liquor sales controls</h2>
                <p className={cn('mt-0.5 max-w-xl text-[0.7rem] leading-5', MUTED)}>Age verification is required at checkout and recorded with each new liquor sale.</p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <div className="min-w-[92px] rounded-lg border border-[var(--dashboard-success-soft-border)] bg-[var(--dashboard-success-soft)] px-3 py-2">
                <p className={cn('text-base font-bold tabular-nums', TEXT)}>{formatNumber(overview.liquorCompliance.verifiedToday)}</p>
                <p className={cn('mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]', MUTED)}>Verified today</p>
              </div>
              <div className={cn('min-w-[92px] rounded-lg border px-3 py-2', overview.liquorCompliance.unverifiedToday ? 'border-[var(--dashboard-danger-soft-border)] bg-[var(--dashboard-danger-soft)]' : cn(DIVIDER, 'bg-[var(--dashboard-surface-subtle)]'))}>
                <p className={cn('text-base font-bold tabular-nums', overview.liquorCompliance.unverifiedToday ? 'text-[var(--dashboard-danger)]' : TEXT)}>{formatNumber(overview.liquorCompliance.unverifiedToday)}</p>
                <p className={cn('mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]', MUTED)}>Needs review</p>
              </div>
            </div>

            <Link href="/dashboard/operations" className={cn('inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3.5 text-xs font-semibold transition-all hover:bg-[var(--dashboard-surface-subtle)]', DIVIDER, TEXT)}>
              <CircleAlert className="h-4 w-4" />
              Register controls
            </Link>
          </article>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Operating performance + month to date                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,.72fr)]">
        <article className={cn(PANEL, 'overflow-hidden')}>
          <div className={cn('flex flex-col gap-2.5 border-b px-5 py-3 sm:flex-row sm:items-center sm:justify-between', DIVIDER)}>
            <div>
              <h2 className={cn('text-[0.95rem] font-bold', TEXT)}>Operating performance</h2>
              <p className={cn('mt-0.5 text-xs', MUTED)}>Sales and recorded expenses · Live 30-day history</p>
            </div>
            <div className={cn('flex items-center gap-4 text-xs font-medium', MUTED)}>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[var(--dashboard-chart-revenue)]" />Sales</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[var(--dashboard-chart-secondary)]" />Expenses</span>
              <Link href="/dashboard/reports" className="font-semibold text-[var(--dashboard-accent)] hover:opacity-80">Reports</Link>
            </div>
          </div>
          <div className="px-4 pb-3 pt-4 sm:px-5">
            <OperatingChart data={overview.revenueSeries} currency={currency} />
          </div>
        </article>

        <aside className={cn(PANEL, 'flex h-full min-h-[270px] flex-col overflow-hidden')}>
          <div className={cn('border-b px-5 py-3', DIVIDER)}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className={cn('text-[0.95rem] font-bold', TEXT)}>Team & locations</h2>
                <p className={cn('mt-0.5 text-xs', MUTED)}>People and places in your workspace</p>
              </div>
              <UsersRound className={cn('h-4 w-4', MUTED)} />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2 border-b bg-[var(--dashboard-surface-subtle)] p-2.5">
            <Link href="/dashboard/settings" className={cn('group flex flex-1 items-center justify-between gap-3 rounded-xl border bg-[var(--dashboard-surface)] px-4 py-3 hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-surface-subtle)]', DIVIDER)}>
              <div><p className={cn('text-sm font-semibold', TEXT)}>Staff members</p><p className={cn('mt-0.5 text-xs', MUTED)}>People with access to this workspace</p></div>
              <div className="flex items-center gap-3"><p className={cn('text-base font-bold tabular-nums', TEXT)}>{formatNumber(overview.records.staff)}</p><ArrowRight className="h-3.5 w-3.5 text-[var(--dashboard-accent)] opacity-0 group-hover:opacity-100" /></div>
            </Link>
            <Link href="/dashboard/operations" className={cn('group flex flex-1 items-center justify-between gap-3 rounded-xl border bg-[var(--dashboard-surface)] px-4 py-3 hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-surface-subtle)]', DIVIDER)}>
              <div><p className={cn('text-sm font-semibold', TEXT)}>Business locations</p><p className={cn('mt-0.5 text-xs', MUTED)}>Active branches and outlets</p></div>
              <div className="flex items-center gap-3"><p className={cn('text-base font-bold tabular-nums', TEXT)}>{formatNumber(overview.records.branches)}</p><ArrowRight className="h-3.5 w-3.5 text-[var(--dashboard-accent)] opacity-0 group-hover:opacity-100" /></div>
            </Link>
            <Link href="/dashboard/customers" className={cn('group flex flex-1 items-center justify-between gap-3 rounded-xl border bg-[var(--dashboard-surface)] px-4 py-3 hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-surface-subtle)]', DIVIDER)}>
              <div><p className={cn('text-sm font-semibold', TEXT)}>Customer records</p><p className={cn('mt-0.5 text-xs', MUTED)}>Saved customer profiles</p></div>
              <div className="flex items-center gap-3"><p className={cn('text-base font-bold tabular-nums', TEXT)}>{formatNumber(overview.records.customers)}</p><ArrowRight className="h-3.5 w-3.5 text-[var(--dashboard-accent)] opacity-0 group-hover:opacity-100" /></div>
            </Link>
          </div>
        </aside>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Recent activity + stock                                         */}
      {/* ---------------------------------------------------------------- */}
      <section className={cn('grid items-start gap-4', hasInventory && 'xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]')}>
        <article className={cn(PANEL, 'overflow-hidden')}>
          <SectionHeader title={experience.activityTitle} description={experience.activityDescription} href="/dashboard/sales" />
          {overview.recentSales.length ? (
            <>
              <div className={cn('divide-y sm:hidden', DIVIDER)}>
                {overview.recentSales.map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                    <div className="min-w-0">
                      <p className={cn('truncate text-sm font-semibold', TEXT)}>{record.receiptNo}</p>
                      <p className={cn('mt-0.5 text-xs', MUTED)}>{methodLabel(record.paymentMethod)} · {record.createdAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <p className={cn('text-sm font-semibold tabular-nums', TEXT)}>{formatCurrency(record.total, currency)}</p>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className={cn('text-[0.62rem] uppercase tracking-[0.12em]', MUTED)}>
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Receipt</th>
                      <th className="px-4 py-3.5 font-semibold">Date</th>
                      <th className="px-4 py-3.5 font-semibold">Payment</th>
                      <th className="px-6 py-3.5 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.recentSales.map((record) => (
                      <tr key={record.id} className="border-t border-[var(--dashboard-border)] transition-colors hover:bg-[var(--dashboard-surface-subtle)]">
                        <td className={cn('px-6 py-3 font-semibold', TEXT)}>{record.receiptNo}</td>
                        <td className={cn('px-4 py-3 text-xs', MUTED)}>{record.createdAt.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3"><PaymentBadge method={record.paymentMethod} /></td>
                        <td className={cn('px-6 py-3 text-right font-bold tabular-nums', TEXT)}>{formatCurrency(record.total, currency)}</td>
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
            <article className={cn(PANEL, 'flex h-full flex-col overflow-hidden')}>
              <div className={cn('flex items-center justify-between gap-4 border-b px-5 py-4', DIVIDER)}>
                <div>
                  <h2 className={cn('text-[0.95rem] font-bold', TEXT)}>Action centre</h2>
                  <p className={cn('mt-0.5 text-xs', MUTED)}>Important follow-ups for your business.</p>
                </div>
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', BRAND_ICON)}>
                  <ReceiptText className="h-4 w-4" />
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 border-b bg-[var(--dashboard-surface-subtle)] p-2.5">
                <ActionMetric label="Out of stock" value={formatNumber(overview.records.outOfStock)} detail="Products unavailable" href="/dashboard/inventory" alert={overview.records.outOfStock > 0} />
                <ActionMetric label="Inventory value" value={formatCurrency(overview.records.inventoryCost, currency)} detail="At buying cost" href="/dashboard/inventory" />
                {hasCustomers && <ActionMetric label="Customer records" value={formatNumber(overview.records.customers)} detail="Saved customers" href="/dashboard/customers" />}
                {workspaceConfig.businessCategory === 'liquor_shop' && <ActionMetric label="Compliance reviews" value={formatNumber(overview.liquorCompliance.unverifiedToday)} detail="Unverified sales today" href="/dashboard/operations" alert={overview.liquorCompliance.unverifiedToday > 0} />}
              </div>
              <Link href="/dashboard/reports" className="m-2.5 flex h-10 items-center justify-between rounded-lg bg-[var(--dashboard-accent-cta)] px-4 text-xs font-bold text-[var(--dashboard-accent-cta-ink)] hover:bg-[var(--dashboard-accent-cta-hover)]">
                Open detailed reports <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          </aside>
        )}
      </section>
    </div>
  )
}

function PaymentBadge({ method }: { method: string }) {
  const normalized = method.toLowerCase().replace(/[_-]/g, ' ')
  if (normalized.includes('mpesa') || normalized.includes('m pesa')) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f8f0] px-2 py-1 text-[0.68rem] font-semibold text-[#087a42]" aria-label="Paid with M-Pesa"><span className="text-[0.56rem] font-extrabold tracking-[-0.04em]"><i className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-[#e1261c]" />M‑PESA</span></span>
  }
  if (normalized.includes('card')) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4ff] px-2 py-1 text-[0.68rem] font-semibold text-[#1a4db3]" aria-label="Paid by card"><span className="text-[0.58rem] font-black italic tracking-[-0.06em] text-[#1434cb]">VISA</span><span className="flex -space-x-1"><i className="h-2.5 w-2.5 rounded-full bg-[#eb001b]" /><i className="h-2.5 w-2.5 rounded-full bg-[#f79e1b] opacity-90" /></span><span>Card</span></span>
  }
  if (normalized.includes('bank')) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3efff] px-2 py-1 text-[0.68rem] font-semibold text-[#6d3bd1]"><Landmark className="h-3 w-3" />Bank transfer</span>
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff8df] px-2 py-1 text-[0.68rem] font-semibold text-[#8a6200]"><Banknote className="h-3 w-3" />Cash</span>
}

function ActionMetric({ label, value, detail, href, alert = false }: { label: string; value: string; detail: string; href: string; alert?: boolean }) {
  return (
    <Link href={href} className={cn('group flex flex-1 items-center justify-between gap-4 rounded-xl border bg-[var(--dashboard-surface)] px-4 py-3 hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-surface-subtle)]', DIVIDER)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-[0.65rem] font-bold uppercase tracking-[0.08em]', MUTED)}>{label}</p>
          {alert && <span className="h-1.5 w-1.5 rounded-full bg-[var(--dashboard-danger)]" />}
        </div>
        <p className={cn('mt-0.5 text-[0.7rem]', MUTED)}>{detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className={cn('text-base font-bold tabular-nums', alert ? 'text-[var(--dashboard-danger)]' : TEXT)}>{value}</p>
        <ArrowRight className="h-3.5 w-3.5 text-[var(--dashboard-accent)] opacity-0 group-hover:opacity-100" />
      </div>
    </Link>
  )
}

function TodayRegisterCard({ currency, revenue, transactions, expenses, saleHref, embedded = false }: { currency: string; revenue: number; transactions: number; expenses: number; saleHref: string; embedded?: boolean }) {
  const averageSale = transactions ? revenue / transactions : 0
  return (
    <div className={cn(embedded ? '' : cn(PANEL, 'overflow-hidden'))}>
              <div className={cn('flex items-start justify-between gap-3 border-b px-5 py-3', DIVIDER)}>
        <div>
          <h2 className={cn('text-[0.95rem] font-bold', TEXT)}>Today&apos;s register</h2>
          <p className={cn('mt-0.5 text-xs', MUTED)}>A quick view of counter activity.</p>
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
          <span className={MUTED}>Average sale</span>
          <strong className={cn('tabular-nums', TEXT)}>{formatCurrency(averageSale, currency)}</strong>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className={MUTED}>Recorded expenses</span>
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
