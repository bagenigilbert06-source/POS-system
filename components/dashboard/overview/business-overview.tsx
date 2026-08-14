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
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { WorkspaceConfig } from '@/lib/types/workspace'
import type { DashboardOverview } from '@/lib/services/dashboard-overview-service'
import { OperatingChart } from './operating-chart'
import { getBusinessExperience } from '@/lib/workspace/business-experience'
import { DashboardInsightCharts } from './dashboard-insight-charts'
import { POSOperationsDashboard } from './pos-operations-dashboard'
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

function methodLabel(method: string) {
  return method.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function BusinessOverview({ organizationName, userName, timeZone, currency, overview, workspaceConfig, generatedAt, role, permissions }: BusinessOverviewProps) {
  const experience = getBusinessExperience(workspaceConfig.businessType, workspaceConfig.businessCategory)
  const hasProducts = workspaceConfig.enabledModules.includes('products')
  const hasInventory = workspaceConfig.enabledModules.includes('inventory')
  const hasCustomers = workspaceConfig.enabledModules.includes('customers')
  const saleHref = workspaceConfig.enabledModules.includes('pos') ? '/dashboard/pos' : '/dashboard/sales'
  const isNewWorkspace = overview.recentSales.length === 0
  const availableActions = [
    ...((workspaceConfig.enabledModules.includes('pos') || workspaceConfig.enabledModules.includes('sales')) && permissions.includes(PermissionEnum.POS_VIEW) ? [{ id: 'primary', label: experience.actionLabels.primary, href: saleHref, icon: ShoppingBag, primary: true, description: 'Record a new sale' }] : []),
    ...(hasProducts && permissions.includes(PermissionEnum.PRODUCT_VIEW) ? [{ id: 'products', label: experience.actionLabels.products, href: '/dashboard/products', icon: Package, primary: false, description: 'Manage products' }] : []),
    ...(hasInventory && permissions.includes(PermissionEnum.INVENTORY_VIEW) ? [{ id: 'inventory', label: experience.actionLabels.inventory, href: '/dashboard/inventory', icon: Boxes, primary: false, description: 'Check stock levels' }] : []),
    ...(hasCustomers && permissions.includes(PermissionEnum.CUSTOMER_VIEW) ? [{ id: 'customers', label: 'Customers', href: '/dashboard/customers', icon: UsersRound, primary: false, description: 'Manage customers' }] : []),
    ...(workspaceConfig.enabledModules.includes('reports') && permissions.includes(PermissionEnum.REPORT_VIEW) ? [{ id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: BarChart3, primary: false, description: 'View insights' }] : []),
  ]
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
        : [{ label: experience.metricLabels[3], value: formatNumber(overview.records.lowStock), detail: `${overview.records.outOfStock} out of stock`, meta: `${formatNumber(overview.records.products)} products tracked`, context: 'Needs attention', icon: TriangleAlert, href: '/dashboard/inventory' }]
      : hasInventory ? [{ label: 'Stock alerts', value: formatNumber(overview.records.lowStock), detail: `${overview.records.outOfStock} out of stock`, meta: `${formatNumber(overview.records.products)} products tracked`, context: 'Needs attention', icon: TriangleAlert, href: '/dashboard/inventory' }] : []),
    ...(!hasInventory && hasCustomers ? [{ label: 'Customer records', value: formatNumber(overview.records.customers), detail: 'Available in this workspace', icon: UsersRound }] : []),
    ...(!hasInventory && !hasCustomers ? [{ label: 'Locations', value: formatNumber(overview.records.branches), detail: 'Active business locations', icon: Building2 }] : []),
  ]

  const updatedAt = generatedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="dashboard-overview mx-auto w-full max-w-[1440px] space-y-4 pb-7">
      <header className="dashboard-welcome flex flex-col gap-4 border-b border-[rgba(255,214,10,0.1)] pb-5 pt-0 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="dashboard-live-status"><i /> Live overview</span>
            <span className="dashboard-updated">Updated {updatedAt}</span>
          </div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#ffd60a]">{role === RoleEnum.MANAGER ? 'Manager · Branch operations' : role === RoleEnum.ADMIN ? 'Admin · Organization overview' : 'Owner · Organization overview'}</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#f5f5f7]"><TimeGreeting name={userName} timeZone={timeZone} /></h1>
          <p className="mt-2 text-sm text-[#a1a1a6]">{role === RoleEnum.MANAGER ? `Today's performance and attention items for your assigned ${overview.records.branches === 1 ? 'branch' : 'branches'}.` : `Today's organization-wide overview for ${organizationName}.`}</p>
        </div>
        <div>
          <div className="flex flex-wrap gap-3">
            {availableActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href} className={action.primary ? 'inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ffd60a] px-5 text-sm font-semibold text-[#0b0b0d] shadow-dark-sm outline-none transition-all hover:shadow-dark-md hover:bg-[#ffdf3a] focus-visible:ring-2 focus-visible:ring-[#ff6961] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d]' : 'inline-flex min-h-10 items-center gap-2 rounded-lg border border-[rgba(255,214,10,0.2)] bg-[rgba(255,255,255,0.05)] px-5 text-sm font-medium text-[#f5f5f7] outline-none transition-all hover:border-[rgba(255,214,10,0.3)] hover:bg-[rgba(255,255,255,0.08)] focus-visible:ring-2 focus-visible:ring-[#ffd60a]' }>
                  <Icon className="h-4 w-4" aria-hidden="true" />{action.label}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      <section aria-label="Today's operating metrics">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            const metricTone = metric.label.toLowerCase().includes('reorder') || metric.label.toLowerCase().includes('stock') ? 'metric-alert' : 'metric-positive'
            const card = (
              <div className={cn('dashboard-metric-card', metricTone, 'rounded-xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3.5 shadow-dark-sm backdrop-blur-sm transition-all duration-200 hover:shadow-dark-md hover:border-[rgba(255,214,10,0.16)] hover:bg-[rgba(255,255,255,0.06)]')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#7d8da6]">{metric.label}</p>{metric.context && <span className="inline-flex rounded-full bg-[rgba(255,214,10,0.08)] px-1.5 py-0.5 text-[0.58rem] font-medium normal-case tracking-normal text-[#8795aa]">{metric.context}</span>}</div></div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,214,10,0.16)] bg-[rgba(255,214,10,0.06)] text-[#ffd60a]"><Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" /></span>
                </div>
                <p className="mt-3 truncate text-[clamp(1.45rem,2.3vw,2rem)] font-semibold tabular-nums tracking-tight text-[#172033]">{metric.value}</p>
                <p className="mt-1 text-[0.68rem] font-normal text-[#8795aa]">{metric.detail}</p>
                {metric.href && <div className="mt-2 flex items-center justify-between gap-3"><span className="truncate text-[0.66rem] font-normal text-[#8795aa]">{metric.meta}</span><span className="inline-flex shrink-0 items-center gap-1 text-[0.66rem] font-semibold text-[#9a6700]">View details <ArrowRight className="h-3 w-3" /></span></div>}
              </div>
            )
            return metric.href ? <Link key={metric.label} href={metric.href} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#ffd60a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d]">{card}</Link> : <article key={metric.label}>{card}</article>
          })}
        </div>
      </section>

      {!isNewWorkspace && <DashboardInsightCharts currency={currency} paymentMix={overview.paymentMix} topProducts={overview.topProducts} stock={{ healthy: overview.records.products - overview.records.lowStock, low: overview.records.lowStock - overview.records.outOfStock, out: overview.records.outOfStock }} productLabel={workspaceConfig.businessCategory === 'liquor_shop' ? 'drinks' : 'products'} />}

      {workspaceConfig.businessCategory === 'liquor_shop' && (
        <section aria-label="Liquor-store controls">
          <article className="flex flex-col gap-5 rounded-2xl border border-[rgba(255,214,10,0.1)] bg-[rgba(255,255,255,0.03)] p-5 shadow-dark-sm backdrop-blur-sm lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,214,10,0.2)] bg-[rgba(255,214,10,0.08)] text-[#ffd60a]"><ShieldCheck className="h-5 w-5" /></span>
              <div className="min-w-0"><h2 className="text-sm font-semibold text-[#f5f5f7]">Liquor sales controls</h2><p className="mt-1 max-w-xl text-xs leading-5 text-[#a1a1a6]">Age verification is required at checkout and recorded with each new liquor sale.</p></div>
            </div>
            <div className="flex shrink-0 gap-2">
              <div className="min-w-[92px] rounded-xl border border-[rgba(22,163,106,0.22)] bg-[rgba(22,163,106,0.08)] px-4 py-2.5"><p className="text-lg font-semibold tabular-nums text-[#f5f5f7]">{formatNumber(overview.liquorCompliance.verifiedToday)}</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#a1a1a6]">verified today</p></div>
              <div className="min-w-[92px] rounded-xl border border-[rgba(255,214,10,0.18)] bg-[rgba(255,214,10,0.06)] px-4 py-2.5"><p className={cn('text-lg font-semibold tabular-nums', overview.liquorCompliance.unverifiedToday ? 'text-[#ff6961]' : 'text-[#f5f5f7]')}>{formatNumber(overview.liquorCompliance.unverifiedToday)}</p><p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#a1a1a6]">needs review</p></div>
            </div>
            <Link href="/dashboard/operations" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[rgba(255,214,10,0.2)] bg-[rgba(255,255,255,0.05)] px-4 text-sm font-medium text-[#f5f5f7] transition-all hover:border-[rgba(255,214,10,0.3)] hover:bg-[rgba(255,255,255,0.08)]"><CircleAlert className="h-4 w-4" />Register controls</Link>
          </article>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,.72fr)]">
        <article className="overflow-hidden rounded-2xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] shadow-dark-sm backdrop-blur-sm">
          <div className="flex flex-col gap-3 border-b border-[rgba(255,214,10,0.08)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[1rem] font-bold text-[#f5f5f7]">Operating performance</h2>
              <p className="mt-1 text-xs text-[#a1a1a6]">Sales and recorded expenses · Live 30-day history</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-[#a1a1a6]">
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-[var(--dashboard-chart-revenue)]" />Sales</span>
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-[var(--dashboard-chart-secondary)]" />Expenses</span>
              <Link href="/dashboard/reports" className="ml-1 font-semibold text-[#ffd60a] hover:text-[#ffdf3a]">Reports</Link>
            </div>
          </div>
          <div className="px-4 pb-4 pt-6 sm:px-6"><OperatingChart data={overview.revenueSeries} currency={currency} /></div>
        </article>

        <aside className="flex h-full min-h-[305px] flex-col overflow-hidden rounded-2xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] shadow-dark-sm backdrop-blur-sm">
          <div className="border-b border-[rgba(255,214,10,0.08)] px-6 py-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-[1rem] font-semibold text-[#f5f5f7]">Month to date</h2><p className="mt-1 text-xs text-[#a1a1a6]">Current operating position</p></div><span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-[#a1a1a6]"><i className="dashboard-live-dot h-2 w-2 rounded-full bg-[#ff6961]" />Live</span></div>
          </div>
          <dl className="flex flex-1 flex-col justify-center divide-y divide-[rgba(255,214,10,0.08)] px-6">
            <SummaryRow label="Sales" value={formatCurrency(overview.month.revenue, currency)} />
            <SummaryRow label="Expenses" value={formatCurrency(overview.month.expenses, currency)} />
            <SummaryRow label="Sales less expenses" value={formatCurrency(overview.month.operatingPosition, currency)} emphasis />
          </dl>
          <div className={cn('grid border-t border-[rgba(255,214,10,0.08)] bg-[rgba(255,214,10,0.04)]', hasProducts && hasCustomers ? 'grid-cols-3' : hasProducts || hasCustomers ? 'grid-cols-2' : 'grid-cols-1')}>
            {hasProducts && <MiniRecord label="Products" value={formatNumber(overview.records.products)} href="/dashboard/products" />}
            {hasCustomers && <MiniRecord label="Customers" value={formatNumber(overview.records.customers)} href="/dashboard/customers" />}
            <MiniRecord label="Locations" value={formatNumber(overview.records.branches)} href={permissions.includes(PermissionEnum.SETTINGS_VIEW) ? '/dashboard/settings' : '/dashboard/operations'} />
          </div>
        </aside>
      </section>

      <section className={cn('grid items-start gap-6', hasInventory && 'xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]')}>
        <article className="overflow-hidden rounded-2xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] shadow-dark-sm backdrop-blur-sm">
          <SectionHeader title={experience.activityTitle} description={experience.activityDescription} href="/dashboard/sales" />
          {overview.recentSales.length ? (
            <>
              <div className="divide-y divide-[rgba(255,214,10,0.08)] sm:hidden">{overview.recentSales.map((record) => <div key={record.id} className="flex items-center justify-between gap-4 px-6 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#f5f5f7]">{record.receiptNo}</p><p className="mt-0.5 text-xs text-[#a1a1a6]">{methodLabel(record.paymentMethod)} · {record.createdAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p></div><p className="text-sm font-semibold tabular-nums text-[#f5f5f7]">{formatCurrency(record.total, currency)}</p></div>)}</div>
              <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-[rgba(255,214,10,0.08)] bg-[rgba(255,214,10,0.04)] text-[0.68rem] uppercase tracking-[0.1em] text-[#a1a1a6]"><tr><th className="px-6 py-4 font-semibold">Receipt</th><th className="px-4 py-4 font-semibold">Date</th><th className="px-4 py-4 font-semibold">Payment</th><th className="px-6 py-4 text-right font-semibold">Total</th></tr></thead><tbody className="divide-y divide-[rgba(255,214,10,0.08)]">{overview.recentSales.map((record) => <tr key={record.id} className="hover:bg-[rgba(255,214,10,0.04)] transition-colors"><td className="px-6 py-4 font-semibold text-[#f5f5f7]">{record.receiptNo}</td><td className="px-4 py-4 text-[#a1a1a6]">{record.createdAt.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td className="px-4 py-4 text-[#a1a1a6]">{methodLabel(record.paymentMethod)}</td><td className="px-6 py-4 text-right font-semibold tabular-nums text-[#f5f5f7]">{formatCurrency(record.total, currency)}</td></tr>)}</tbody></table></div>
            </>
          ) : <EmptyState message="No transactions yet" detail="Completed sales will appear here automatically." href={saleHref} action="Record the first sale" />}
        </article>

        {hasInventory && <aside className="space-y-4">
          <article className="overflow-hidden rounded-2xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] shadow-dark-sm backdrop-blur-sm">
            <SectionHeader title={experience.stockTitle} description={experience.stockDescription} href="/dashboard/inventory" />
            {overview.lowStockProducts.length ? <div className="divide-y divide-[rgba(255,214,10,0.08)] px-5">{overview.lowStockProducts.map((item) => <div key={item.id} className="flex items-center gap-3 py-4"><span className={item.stock <= 0 ? 'h-2.5 w-2.5 shrink-0 rounded-full bg-[#ff6961]' : 'h-2.5 w-2.5 shrink-0 rounded-full bg-[#ffd60a]'} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#f5f5f7]">{item.name}</p><p className="mt-1 truncate text-xs text-[#a1a1a6]">{item.sku || 'No SKU'} · reorder at {item.minStock}</p></div><span className={item.stock <= 0 ? 'shrink-0 rounded-lg bg-[rgba(255,105,107,0.15)] px-3 py-1.5 text-xs font-semibold text-[#ff6961]' : 'shrink-0 rounded-lg bg-[rgba(255,214,10,0.15)] px-3 py-1.5 text-xs font-semibold text-[#ffd60a]'}>{item.stock} left</span></div>)}</div> : <EmptyState message="Stock levels look healthy" detail="No active products currently need attention." href="/dashboard/inventory" action="Review inventory" icon="stock" />}
          </article>
          <TodayRegisterCard currency={currency} revenue={overview.today.revenue} transactions={overview.today.transactions} expenses={overview.today.expenses} saleHref={saleHref} />
        </aside>}
      </section>

    </div>
  )
}

function TodayRegisterCard({ currency, revenue, transactions, expenses, saleHref }: { currency: string; revenue: number; transactions: number; expenses: number; saleHref: string }) {
  const averageSale = transactions ? revenue / transactions : 0
  return <article className="overflow-hidden rounded-2xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] shadow-dark-sm backdrop-blur-sm">
    <div className="flex items-start justify-between gap-3 border-b border-[rgba(255,214,10,0.08)] px-5 py-4">
      <div><h2 className="text-[1rem] font-bold text-[#f5f5f7]">Today&apos;s register</h2><p className="mt-1 text-xs text-[#a1a1a6]">A quick view of counter activity.</p></div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(255,214,10,0.08)] text-[#ffd60a]"><ReceiptText className="h-4 w-4" /></span>
    </div>
    <dl className="grid grid-cols-2 divide-x divide-[rgba(255,214,10,0.08)] border-b border-[rgba(255,214,10,0.08)]">
      <div className="px-5 py-4"><dt className="text-[0.68rem] font-medium uppercase tracking-[.08em] text-[#a1a1a6]">Sales</dt><dd className="mt-1 text-lg font-bold tabular-nums text-[#f5f5f7]">{formatCurrency(revenue, currency)}</dd></div>
      <div className="px-5 py-4"><dt className="text-[0.68rem] font-medium uppercase tracking-[.08em] text-[#a1a1a6]">Receipts</dt><dd className="mt-1 text-lg font-bold tabular-nums text-[#f5f5f7]">{formatNumber(transactions)}</dd></div>
    </dl>
    <div className="space-y-2 px-5 py-4 text-sm"><div className="flex items-center justify-between gap-3"><span className="text-[#a1a1a6]">Average sale</span><strong className="tabular-nums text-[#f5f5f7]">{formatCurrency(averageSale, currency)}</strong></div><div className="flex items-center justify-between gap-3"><span className="text-[#a1a1a6]">Recorded expenses</span><strong className="tabular-nums text-[#f5f5f7]">{formatCurrency(expenses, currency)}</strong></div></div>
    <div className="grid grid-cols-2 gap-2 border-t border-[rgba(255,214,10,0.08)] bg-[rgba(255,214,10,0.04)] p-3"><Link href={saleHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#ffd60a] px-3 text-xs font-bold text-[#0b0b0d] transition-colors hover:bg-[#ffdf3a]"><ShoppingBag className="h-3.5 w-3.5" />Start sale</Link><Link href="/dashboard/sales" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(255,214,10,0.16)] bg-[rgba(255,255,255,0.04)] px-3 text-xs font-semibold text-[#f5f5f7] transition-colors hover:bg-[rgba(255,255,255,0.08)]">View receipts <ArrowRight className="h-3.5 w-3.5" /></Link></div>
  </article>
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-4"><dt className="text-sm text-[#a1a1a6]">{label}</dt><dd className={emphasis ? 'text-base font-bold tabular-nums text-[#f5f5f7]' : 'text-sm font-semibold tabular-nums text-[#f5f5f7]'}>{value}</dd></div>
}

function MiniRecord({ label, value, href }: { label: string; value: string; href: string }) {
  return <Link href={href} className="border-r border-[rgba(255,214,10,0.08)] px-3 py-4 text-center last:border-r-0 hover:bg-[rgba(255,214,10,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffd60a] transition-colors"><span className="block text-sm font-bold tabular-nums text-[#f5f5f7]">{value}</span><span className="mt-0.5 block text-[0.7rem] text-[#a1a1a6]">{label}</span></Link>
}

function SectionHeader({ title, description, href }: { title: string; description: string; href?: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-[rgba(255,214,10,0.08)] px-6 py-5 sm:px-6"><div><h2 className="text-[1rem] font-bold text-[#f5f5f7]">{title}</h2><p className="mt-1 text-xs text-[#a1a1a6]">{description}</p></div>{href && <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#ffd60a] hover:text-[#ffdf3a] transition-colors">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}</div>
}

function EmptyState({ message, detail, href, action, icon = 'receipt' }: { message: string; detail: string; href: string; action: string; icon?: 'receipt' | 'stock' }) {
  const Icon = icon === 'stock' ? PackageOpen : ReceiptText
  return <div className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgba(255,214,10,0.08)] text-[#a1a1a6]"><Icon className="h-6 w-6" /></span><p className="mt-3 text-sm font-semibold text-[#f5f5f7]">{message}</p><p className="mt-1 max-w-xs text-xs leading-5 text-[#a1a1a6]">{detail}</p><Link href={href} className="mt-4 text-xs font-semibold text-[#ffd60a] hover:text-[#ffdf3a]">{action}</Link></div>
}
