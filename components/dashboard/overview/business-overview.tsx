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
  return <POSOperationsDashboard currency={currency} overview={overview} saleHref={saleHref} />
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
    <div className="mx-auto w-full max-w-[1440px] space-y-3 pb-6">
      <header className="flex flex-col gap-3 pb-1 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-[#e42527]">{experience.label}</p>
          <h1 className="mt-1 text-[1.6rem] font-bold tracking-[-0.035em] text-[#050a1f] sm:text-[1.9rem]">Overview</h1>
          <p className="mt-1 text-sm text-[#667085]">Today · organization-wide · updated at {updatedAt}</p>
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            {availableActions.slice(0, isNewWorkspace ? 2 : 3).map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href} className={action.primary ? 'inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ffda32] px-4 text-sm font-bold text-[#050a1f] shadow-sm outline-none transition-colors hover:bg-[#f0c900] focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2' : 'inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dde5] bg-white px-4 text-sm font-semibold text-[#172033] outline-none transition-colors hover:border-[#b9c0cc] hover:bg-[#f8f9fb] focus-visible:ring-2 focus-visible:ring-[#ffda32]' }>
                  <Icon className="h-4 w-4" aria-hidden="true" />{action.label}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      <section aria-label="Today's operating metrics">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <Link key={metric.label} href={metric.href ?? '/dashboard'} className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-4 py-3 shadow-[0_1px_3px_rgba(16,24,40,.06)] hover:border-[#d5bd42] hover:shadow-[0_3px_10px_rgba(16,24,40,.07)] dark:hover:border-[#746929] sm:min-h-[112px]">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[0.78rem] font-semibold text-[#667085]">{metric.label}</p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#ead77b] bg-[#fff8d6] text-[#5f4b00] dark:border-[#5f5526] dark:bg-[#292513] dark:text-[#ffdf45]"><Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" /></span>
                </div>
                <p className="mt-2 text-[1.4rem] font-bold tabular-nums tracking-[-0.035em] text-[#050a1f]">{metric.value}</p>
                <p className="mt-1 text-xs text-[#8a94a5]">{metric.detail}</p>
              </Link>
            )
          })}
        </div>
      </section>

      {workspaceConfig.businessCategory === 'liquor_shop' && !isNewWorkspace && (
        <section className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]" aria-label="Liquor-store controls">
          <article className="flex flex-col gap-3 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-3 shadow-[0_1px_2px_rgba(16,24,40,.03)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff8d6] text-[#5f4b00] dark:bg-[#292513] dark:text-[#ffdf45]"><ShieldCheck className="h-5 w-5" /></span>
              <div><h2 className="text-sm font-bold text-[var(--dashboard-text)]">Liquor sales controls</h2><p className="mt-1 text-xs leading-5 text-[var(--dashboard-muted)]">Age verification is required at checkout and recorded with each new liquor sale.</p></div>
            </div>
            <div className="flex divide-x divide-[var(--dashboard-border)] rounded-lg border border-[var(--dashboard-border)] text-center">
              <div className="min-w-[92px] px-3 py-2"><p className="text-lg font-bold tabular-nums text-[var(--dashboard-text)]">{formatNumber(overview.liquorCompliance.verifiedToday)}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--dashboard-muted)]">verified today</p></div>
              <div className="min-w-[92px] px-3 py-2"><p className={cn('text-lg font-bold tabular-nums', overview.liquorCompliance.unverifiedToday ? 'text-[#c51f21]' : 'text-[var(--dashboard-text)]')}>{formatNumber(overview.liquorCompliance.unverifiedToday)}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--dashboard-muted)]">needs review</p></div>
            </div>
          </article>
          <Link href="/dashboard/operations" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-4 text-sm font-semibold text-[var(--dashboard-text)] hover:bg-[#f7f8fa] dark:hover:bg-white/5"><CircleAlert className="h-4 w-4" />Register controls</Link>
        </section>
      )}

      {isNewWorkspace ? <GettingStartedPanel saleHref={saleHref} hasProducts={hasProducts} hasInventory={hasInventory} /> : <section className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,.72fr)]">
        <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <div className="flex flex-col gap-2 border-b border-[#edf0f4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-[0.95rem] font-bold text-[#101828]">Operating performance</h2>
              <p className="mt-1 text-xs text-[#7b8495]">Sales and recorded expenses · Live 30-day history</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-[#667085]">
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#e42527]" />Sales</span>
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-[#ffda32]" />Expenses</span>
              <Link href="/dashboard/reports" className="ml-1 font-semibold text-[#172033] hover:underline">Reports</Link>
            </div>
          </div>
          <div className="px-2 pb-1 pt-2 sm:px-4"><OperatingChart data={overview.revenueSeries} currency={currency} /></div>
        </article>

        <aside className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <div className="border-b border-[#edf0f4] px-4 py-3">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-[0.95rem] font-bold text-[#101828]">Month to date</h2><p className="mt-1 text-xs text-[#7b8495]">Current operating position</p></div><span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-[#667085]">Updated {updatedAt}</span></div>
          </div>
          <dl className="divide-y divide-[#edf0f4] px-4">
            <SummaryRow label="Sales" value={formatCurrency(overview.month.revenue, currency)} />
            <SummaryRow label="Expenses" value={formatCurrency(overview.month.expenses, currency)} />
            <SummaryRow label="Sales less expenses" value={formatCurrency(overview.month.operatingPosition, currency)} emphasis />
          </dl>
          <div className={cn('grid border-t border-[#edf0f4] bg-[#fafbfc]', hasProducts && hasCustomers ? 'grid-cols-3' : hasProducts || hasCustomers ? 'grid-cols-2' : 'grid-cols-1')}>
            {hasProducts && <MiniRecord label="Products" value={formatNumber(overview.records.products)} href="/dashboard/products" />}
            {hasCustomers && <MiniRecord label="Customers" value={formatNumber(overview.records.customers)} href="/dashboard/customers" />}
            <MiniRecord label="Locations" value={formatNumber(overview.records.branches)} href="/dashboard/settings" />
          </div>
        </aside>
      </section>}

      {!isNewWorkspace && <DashboardInsightCharts currency={currency} paymentMix={overview.paymentMix} topProducts={overview.topProducts} stock={{ healthy: overview.records.products - overview.records.lowStock, low: overview.records.lowStock - overview.records.outOfStock, out: overview.records.outOfStock }} productLabel={workspaceConfig.businessCategory === 'liquor_shop' ? 'drinks' : 'products'} />}

      <section className={cn('grid gap-3', hasInventory && 'xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]')}>
        <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <SectionHeader title={experience.activityTitle} description={experience.activityDescription} href="/dashboard/sales" />
          {overview.recentSales.length ? (
            <>
              <div className="divide-y divide-[#edf0f4] sm:hidden">{overview.recentSales.map((record) => <div key={record.id} className="flex items-center justify-between gap-4 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#101828]">{record.receiptNo}</p><p className="mt-0.5 text-xs text-[#7b8495]">{methodLabel(record.paymentMethod)} · {record.createdAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p></div><p className="text-sm font-semibold tabular-nums text-[#101828]">{formatCurrency(record.total, currency)}</p></div>)}</div>
              <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-[#edf0f4] bg-[#fafbfc] text-[0.68rem] uppercase tracking-[0.08em] text-[#8a94a5]"><tr><th className="px-6 py-3 font-semibold">Receipt</th><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Payment</th><th className="px-6 py-3 text-right font-semibold">Total</th></tr></thead><tbody className="divide-y divide-[#edf0f4]">{overview.recentSales.map((record) => <tr key={record.id} className="hover:bg-[#fafbfc]"><td className="px-6 py-3.5 font-semibold text-[#101828]">{record.receiptNo}</td><td className="px-4 py-3.5 text-[#667085]">{record.createdAt.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td className="px-4 py-3.5 text-[#667085]">{methodLabel(record.paymentMethod)}</td><td className="px-6 py-3.5 text-right font-semibold tabular-nums text-[#101828]">{formatCurrency(record.total, currency)}</td></tr>)}</tbody></table></div>
            </>
          ) : <EmptyState message="No transactions yet" detail="Completed sales will appear here automatically." href={saleHref} action="Record the first sale" />}
        </article>

        {hasInventory && <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <SectionHeader title={experience.stockTitle} description={experience.stockDescription} href="/dashboard/inventory" />
          {overview.lowStockProducts.length ? <div className="divide-y divide-[#edf0f4] px-5">{overview.lowStockProducts.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3.5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#101828]">{item.name}</p><p className="mt-0.5 text-xs text-[#8a94a5]">{item.sku || 'No SKU'} · reorder at {item.minStock}</p></div><span className={item.stock <= 0 ? 'rounded-md bg-[#fff0f0] px-2 py-1 text-xs font-semibold text-[#c51f21]' : 'rounded-md bg-[#fff7d1] px-2 py-1 text-xs font-semibold text-[#6b5200]'}>{item.stock} left</span></div>)}</div> : <EmptyState message="Stock levels look healthy" detail="No active products currently need attention." href="/dashboard/inventory" action="Review inventory" icon="stock" />}
        </article>}
      </section>

    </div>
  )
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-[#667085]">{label}</dt><dd className={emphasis ? 'text-base font-bold tabular-nums text-[#050a1f]' : 'text-sm font-semibold tabular-nums text-[#101828]'}>{value}</dd></div>
}

function GettingStartedPanel({ saleHref, hasProducts, hasInventory }: { saleHref: string; hasProducts: boolean; hasInventory: boolean }) {
  const steps = [
    ...(hasProducts ? [{ label: 'Add products', detail: 'Create products with pricing before selling.', href: '/dashboard/products' }] : []),
    ...(hasInventory ? [{ label: 'Add opening stock', detail: 'Record available stock so checkout stays accurate.', href: '/dashboard/inventory' }] : []),
    { label: 'Configure receipts and payment methods', detail: 'Check the details shown to customers before the first sale.', href: '/dashboard/settings' },
    { label: 'Start your first sale', detail: 'Use the POS once your catalogue is ready.', href: saleHref },
  ]
  return <section className="grid overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_1px_3px_rgba(16,24,40,.05)] lg:grid-cols-[minmax(0,1fr)_280px]"><div className="p-5"><p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-[#e42527]">Next steps</p><h2 className="mt-1 text-lg font-bold text-[var(--dashboard-text)]">Get ready for your first sale</h2><div className="mt-4 divide-y divide-[var(--dashboard-border)]">{steps.map((step, index) => <Link key={step.href} href={step.href} className="flex items-center gap-3 py-3 first:pt-0 hover:text-[#e42527]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff8d6] text-xs font-bold text-[#5f4b00]">{index + 1}</span><span><span className="block text-sm font-semibold text-[var(--dashboard-text)]">{step.label}</span><span className="mt-0.5 block text-xs text-[var(--dashboard-muted)]">{step.detail}</span></span></Link>)}</div></div><div className="flex flex-col justify-center border-t border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] p-5 lg:border-l lg:border-t-0"><p className="text-sm font-bold text-[var(--dashboard-text)]">Start selling faster</p><p className="mt-2 text-sm leading-6 text-[var(--dashboard-muted)]">Add your catalogue and stock once, then complete every sale from the POS.</p><Link href={saleHref} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#ffda32] px-4 text-sm font-bold text-[#050a1f] hover:bg-[#f0c900]">Open POS</Link></div></section>
}

function MiniRecord({ label, value, href }: { label: string; value: string; href: string }) {
  return <Link href={href} className="border-r border-[#edf0f4] px-2 py-3 text-center last:border-r-0 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e42527]"><span className="block text-sm font-bold tabular-nums text-[#101828]">{value}</span><span className="mt-0.5 block text-[0.67rem] text-[#8a94a5]">{label}</span></Link>
}

function SectionHeader({ title, description, href }: { title: string; description: string; href?: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-[#edf0f4] px-4 py-3 sm:px-5"><div><h2 className="text-[0.95rem] font-bold text-[#101828]">{title}</h2><p className="mt-1 text-xs text-[#7b8495]">{description}</p></div>{href && <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#344054] hover:text-[#e42527]">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}</div>
}

function EmptyState({ message, detail, href, action, icon = 'receipt' }: { message: string; detail: string; href: string; action: string; icon?: 'receipt' | 'stock' }) {
  const Icon = icon === 'stock' ? PackageOpen : ReceiptText
  return <div className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3f5f7] text-[#7b8495]"><Icon className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-[#101828]">{message}</p><p className="mt-1 max-w-xs text-xs leading-5 text-[#8a94a5]">{detail}</p><Link href={href} className="mt-4 text-xs font-semibold text-[#e42527] hover:underline">{action}</Link></div>
}
