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

interface BusinessOverviewProps {
  organizationName: string
  userName?: string | null
  timeZone: string
  currency: string
  overview: DashboardOverview
  workspaceConfig: WorkspaceConfig
  generatedAt: Date
}

function methodLabel(method: string) {
  return method.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function BusinessOverview({ organizationName, currency, overview, workspaceConfig, generatedAt }: BusinessOverviewProps) {
  const experience = getBusinessExperience(workspaceConfig.businessType, workspaceConfig.businessCategory)
  const hasProducts = workspaceConfig.enabledModules.includes('products')
  const hasInventory = workspaceConfig.enabledModules.includes('inventory')
  const hasCustomers = workspaceConfig.enabledModules.includes('customers')
  const saleHref = workspaceConfig.enabledModules.includes('pos') ? '/dashboard/pos' : '/dashboard/sales'
  const isNewWorkspace = overview.recentSales.length === 0
  const availableActions = [
    ...(workspaceConfig.enabledModules.includes('pos') || workspaceConfig.enabledModules.includes('sales') ? [{ id: 'primary', label: experience.actionLabels.primary, href: saleHref, icon: ShoppingBag, primary: true, description: 'Record a new sale' }] : []),
    ...(hasProducts ? [{ id: 'products', label: experience.actionLabels.products, href: '/dashboard/products', icon: Package, primary: false, description: 'Manage products' }] : []),
    ...(hasInventory ? [{ id: 'inventory', label: experience.actionLabels.inventory, href: '/dashboard/inventory', icon: Boxes, primary: false, description: 'Check stock levels' }] : []),
    ...(hasCustomers ? [{ id: 'customers', label: 'Customers', href: '/dashboard/customers', icon: UsersRound, primary: false, description: 'Manage customers' }] : []),
    ...(workspaceConfig.enabledModules.includes('reports') ? [{ id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: BarChart3, primary: false, description: 'View insights' }] : []),
  ]
  const transactionAverage = overview.today.transactions ? overview.today.revenue / overview.today.transactions : 0
  const commerceMetrics = experience.kind === 'retail' || experience.kind === 'hospitality'
  const metrics = [
    { label: experience.metricLabels[0], value: formatCurrency(overview.today.revenue, currency), detail: `${formatNumber(overview.today.transactions)} completed`, icon: TrendingUp, href: '/dashboard/sales' },
    commerceMetrics
      ? { label: experience.metricLabels[1], value: formatNumber(overview.today.transactions), detail: experience.kind === 'hospitality' ? 'Completed counter orders' : 'Completed sales', icon: ReceiptText, href: '/dashboard/sales' }
      : { label: experience.metricLabels[1], value: formatCurrency(overview.today.expenses, currency), detail: 'Recorded today', icon: CreditCard, href: '/dashboard/expenses' },
    commerceMetrics
      ? { label: experience.metricLabels[2], value: formatCurrency(transactionAverage, currency), detail: experience.kind === 'hospitality' ? 'Per completed order' : 'Per completed sale', icon: BadgeDollarSign, href: '/dashboard/sales' }
      : { label: experience.metricLabels[2], value: formatCurrency(overview.today.operatingPosition, currency), detail: 'Sales less expenses', icon: BadgeDollarSign, href: '/dashboard/reports' },
    ...(hasInventory && commerceMetrics
      ? experience.kind === 'hospitality'
        ? [{ label: experience.metricLabels[3], value: formatNumber(overview.records.products), detail: 'Available menu items', icon: Package, href: '/dashboard/products' }]
        : [{ label: experience.metricLabels[3], value: formatNumber(overview.records.lowStock), detail: `${overview.records.outOfStock} out of stock`, icon: TriangleAlert, href: '/dashboard/inventory' }]
      : hasInventory ? [{ label: 'Stock alerts', value: formatNumber(overview.records.lowStock), detail: `${overview.records.outOfStock} out of stock`, icon: TriangleAlert, href: '/dashboard/inventory' }] : []),
    ...(!hasInventory && hasCustomers ? [{ label: 'Customer records', value: formatNumber(overview.records.customers), detail: 'Available in this workspace', icon: UsersRound }] : []),
    ...(!hasInventory && !hasCustomers ? [{ label: 'Locations', value: formatNumber(overview.records.branches), detail: 'Active business locations', icon: Building2 }] : []),
  ]

  const updatedAt = generatedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 pb-12">
      <header className="flex flex-col gap-6 border-b border-[rgba(255,214,10,0.1)] pb-8 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#ffd60a]">{experience.label} · Operations</p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-[#f5f5f7]"><TimeGreeting name={userName} timeZone={timeZone} /></h1>
          <p className="mt-2 text-sm text-[#a1a1a6]">Today&apos;s operating overview for {organizationName}.</p>
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className="rounded-2xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] px-6 py-5 shadow-dark-sm backdrop-blur-sm transition-all duration-200 hover:shadow-dark-md hover:border-[rgba(255,214,10,0.16)] hover:bg-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold text-[#a1a1a6] uppercase tracking-wide">{metric.label}</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(255,214,10,0.2)] bg-[rgba(255,214,10,0.08)] text-[#ffd60a]"><Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" /></span>
                </div>
                <p className="mt-4 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-[#f5f5f7]">{metric.value}</p>
                <p className="mt-2 text-xs text-[#a1a1a6]">{metric.detail}</p>
              </article>
            )
          })}
        </div>
      </section>

      {workspaceConfig.businessCategory === 'liquor_shop' && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]" aria-label="Liquor-store controls">
          <article className="flex flex-col gap-4 rounded-2xl border border-[rgba(255,214,10,0.1)] bg-[rgba(255,255,255,0.03)] p-6 shadow-dark-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,214,10,0.2)] bg-[rgba(255,214,10,0.08)] text-[#ffd60a]"><ShieldCheck className="h-6 w-6" /></span>
              <div><h2 className="text-sm font-bold text-[#f5f5f7]">Liquor sales controls</h2><p className="mt-1 text-xs leading-5 text-[#a1a1a6]">Age verification is required at checkout and recorded with each new liquor sale.</p></div>
            </div>
            <div className="flex divide-x divide-[rgba(255,214,10,0.08)] rounded-lg border border-[rgba(255,214,10,0.1)] text-center">
              <div className="min-w-[100px] px-4 py-3"><p className="text-xl font-bold tabular-nums text-[#f5f5f7]">{formatNumber(overview.liquorCompliance.verifiedToday)}</p><p className="text-[11px] font-semibold uppercase tracking-wide text-[#a1a1a6] mt-1">verified today</p></div>
              <div className="min-w-[100px] px-4 py-3"><p className={cn('text-xl font-bold tabular-nums', overview.liquorCompliance.unverifiedToday ? 'text-[#ff6961]' : 'text-[#f5f5f7]')}>{formatNumber(overview.liquorCompliance.unverifiedToday)}</p><p className="text-[11px] font-semibold uppercase tracking-wide text-[#a1a1a6] mt-1">needs review</p></div>
            </div>
          </article>
          <Link href="/dashboard/operations" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(255,214,10,0.2)] bg-[rgba(255,255,255,0.05)] px-6 text-sm font-medium text-[#f5f5f7] transition-all hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,214,10,0.3)]"><CircleAlert className="h-4 w-4" />Register controls</Link>
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
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#ff6961]" />Sales</span>
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-[#ffd60a]" />Expenses</span>
              <Link href="/dashboard/reports" className="ml-1 font-semibold text-[#ffd60a] hover:text-[#ffdf3a]">Reports</Link>
            </div>
          </div>
          <div className="px-4 pb-4 pt-6 sm:px-6"><OperatingChart data={overview.revenueSeries} currency={currency} /></div>
        </article>

        <aside className="overflow-hidden rounded-2xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] shadow-dark-sm backdrop-blur-sm">
          <div className="border-b border-[rgba(255,214,10,0.08)] px-6 py-5">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-[1rem] font-bold text-[#f5f5f7]">Month to date</h2><p className="mt-1 text-xs text-[#a1a1a6]">Current operating position</p></div><span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-[#a1a1a6]"><i className="h-2 w-2 rounded-full bg-[#ff6961]" />Live</span></div>
          </div>
          <dl className="divide-y divide-[rgba(255,214,10,0.08)] px-6">
            <SummaryRow label="Sales" value={formatCurrency(overview.month.revenue, currency)} />
            <SummaryRow label="Expenses" value={formatCurrency(overview.month.expenses, currency)} />
            <SummaryRow label="Sales less expenses" value={formatCurrency(overview.month.operatingPosition, currency)} emphasis />
          </dl>
          <div className={cn('grid border-t border-[rgba(255,214,10,0.08)] bg-[rgba(255,214,10,0.04)]', hasProducts && hasCustomers ? 'grid-cols-3' : hasProducts || hasCustomers ? 'grid-cols-2' : 'grid-cols-1')}>
            {hasProducts && <MiniRecord label="Products" value={formatNumber(overview.records.products)} href="/dashboard/products" />}
            {hasCustomers && <MiniRecord label="Customers" value={formatNumber(overview.records.customers)} href="/dashboard/customers" />}
            <MiniRecord label="Locations" value={formatNumber(overview.records.branches)} href="/dashboard/settings" />
          </div>
        </aside>
      </section>

      {!isNewWorkspace && <DashboardInsightCharts currency={currency} paymentMix={overview.paymentMix} topProducts={overview.topProducts} stock={{ healthy: overview.records.products - overview.records.lowStock, low: overview.records.lowStock - overview.records.outOfStock, out: overview.records.outOfStock }} productLabel={workspaceConfig.businessCategory === 'liquor_shop' ? 'drinks' : 'products'} />}

      <section className={cn('grid gap-6', hasInventory && 'xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]')}>
        <article className="overflow-hidden rounded-2xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] shadow-dark-sm backdrop-blur-sm">
          <SectionHeader title={experience.activityTitle} description={experience.activityDescription} href="/dashboard/sales" />
          {overview.recentSales.length ? (
            <>
              <div className="divide-y divide-[rgba(255,214,10,0.08)] sm:hidden">{overview.recentSales.map((record) => <div key={record.id} className="flex items-center justify-between gap-4 px-6 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#f5f5f7]">{record.receiptNo}</p><p className="mt-0.5 text-xs text-[#a1a1a6]">{methodLabel(record.paymentMethod)} · {record.createdAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p></div><p className="text-sm font-semibold tabular-nums text-[#f5f5f7]">{formatCurrency(record.total, currency)}</p></div>)}</div>
              <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-[rgba(255,214,10,0.08)] bg-[rgba(255,214,10,0.04)] text-[0.68rem] uppercase tracking-[0.1em] text-[#a1a1a6]"><tr><th className="px-6 py-4 font-semibold">Receipt</th><th className="px-4 py-4 font-semibold">Date</th><th className="px-4 py-4 font-semibold">Payment</th><th className="px-6 py-4 text-right font-semibold">Total</th></tr></thead><tbody className="divide-y divide-[rgba(255,214,10,0.08)]">{overview.recentSales.map((record) => <tr key={record.id} className="hover:bg-[rgba(255,214,10,0.04)] transition-colors"><td className="px-6 py-4 font-semibold text-[#f5f5f7]">{record.receiptNo}</td><td className="px-4 py-4 text-[#a1a1a6]">{record.createdAt.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td className="px-4 py-4 text-[#a1a1a6]">{methodLabel(record.paymentMethod)}</td><td className="px-6 py-4 text-right font-semibold tabular-nums text-[#f5f5f7]">{formatCurrency(record.total, currency)}</td></tr>)}</tbody></table></div>
            </>
          ) : <EmptyState message="No transactions yet" detail="Completed sales will appear here automatically." href={saleHref} action="Record the first sale" />}
        </article>

        {hasInventory && <article className="overflow-hidden rounded-2xl border border-[rgba(255,214,10,0.08)] bg-[rgba(255,255,255,0.03)] shadow-dark-sm backdrop-blur-sm">
          <SectionHeader title={experience.stockTitle} description={experience.stockDescription} href="/dashboard/inventory" />
          {overview.lowStockProducts.length ? <div className="divide-y divide-[rgba(255,214,10,0.08)] px-6">{overview.lowStockProducts.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#f5f5f7]">{item.name}</p><p className="mt-0.5 text-xs text-[#a1a1a6]">{item.sku || 'No SKU'} · reorder at {item.minStock}</p></div><span className={item.stock <= 0 ? 'rounded-lg bg-[rgba(255,105,107,0.15)] px-3 py-1 text-xs font-semibold text-[#ff6961]' : 'rounded-lg bg-[rgba(255,214,10,0.15)] px-3 py-1 text-xs font-semibold text-[#ffd60a]'}>{item.stock} left</span></div>)}</div> : <EmptyState message="Stock levels look healthy" detail="No active products currently need attention." href="/dashboard/inventory" action="Review inventory" icon="stock" />}
        </article>}
      </section>

    </div>
  )
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
