import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  Boxes,
  Building2,
  CircleAlert,
  CreditCard,
  Package,
  PackageOpen,
  ReceiptText,
  ShoppingBag,
  UsersRound,
  BarChart3,
  Plus,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import type { WorkspaceConfig } from '@/lib/types/workspace'
import type { DashboardOverview } from '@/lib/services/dashboard-overview-service'
import { OperatingChart } from './operating-chart'
import { getBusinessExperience } from '@/lib/workspace/business-experience'
import { QuickActions } from '../widgets/quick-actions'
import { OutstandingPayments } from '../widgets/outstanding-payments'
import { ActivityFeed } from '../widgets/activity-feed'
import { ActionTasks } from '../widgets/action-tasks'
import { OnboardingChecklist } from '../widgets/onboarding-checklist'
import { PerformanceGoals } from '../widgets/performance-goals'

interface BusinessOverviewProps {
  organizationName: string
  userName?: string | null
  currency: string
  overview: DashboardOverview
  workspaceConfig: WorkspaceConfig
}

function methodLabel(method: string) {
  return method.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function BusinessOverview({ organizationName, userName, currency, overview, workspaceConfig }: BusinessOverviewProps) {
  const experience = getBusinessExperience(workspaceConfig.businessType, workspaceConfig.businessCategory)
  const hasProducts = workspaceConfig.enabledModules.includes('products')
  const hasInventory = workspaceConfig.enabledModules.includes('inventory')
  const hasCustomers = workspaceConfig.enabledModules.includes('customers')
  const saleHref = workspaceConfig.enabledModules.includes('pos') ? '/dashboard/pos' : '/dashboard/sales'
  const availableActions = [
    ...(workspaceConfig.enabledModules.includes('pos') || workspaceConfig.enabledModules.includes('sales') ? [{ id: 'primary', label: experience.actionLabels.primary, href: saleHref, icon: ShoppingBag, primary: true, description: 'Record a new sale' }] : []),
    ...(hasProducts ? [{ id: 'products', label: experience.actionLabels.products, href: '/dashboard/products', icon: Package, primary: false, description: 'Manage products' }] : []),
    ...(hasInventory ? [{ id: 'inventory', label: experience.actionLabels.inventory, href: '/dashboard/inventory', icon: Boxes, primary: false, description: 'Check stock levels' }] : []),
    ...(hasCustomers ? [{ id: 'customers', label: 'Customers', href: '/dashboard/customers', icon: UsersRound, primary: false, description: 'Manage customers' }] : []),
    ...(workspaceConfig.enabledModules.includes('reports') ? [{ id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: BarChart3, primary: false, description: 'View insights' }] : []),
  ]
  
  // Mock data for demonstration - replace with real queries
  const outstandingPayments: any[] = [] // Will come from real data
  const activityItems: any[] = [] // Will come from real data
  const actionTasks: any[] = [] // Will come from real data
  const onboardingSteps: any[] = [] // Will come from real data
  const performanceGoals: any[] = [] // Will come from real data
  const maxPayment = Math.max(...overview.paymentMix.map((item) => item.amount), 1)
  const firstName = userName?.trim().split(/\s+/)[0]

  const transactionAverage = overview.today.transactions ? overview.today.revenue / overview.today.transactions : 0
  const commerceMetrics = experience.kind === 'retail' || experience.kind === 'hospitality'
  const metrics = [
    { label: experience.metricLabels[0], value: formatCurrency(overview.today.revenue, currency), detail: `${formatNumber(overview.today.transactions)} completed`, icon: Banknote },
    commerceMetrics
      ? { label: experience.metricLabels[1], value: formatNumber(overview.today.transactions), detail: experience.kind === 'hospitality' ? 'Completed counter orders' : 'Completed sales', icon: ReceiptText }
      : { label: experience.metricLabels[1], value: formatCurrency(overview.today.expenses, currency), detail: 'Recorded today', icon: CreditCard },
    commerceMetrics
      ? { label: experience.metricLabels[2], value: formatCurrency(transactionAverage, currency), detail: experience.kind === 'hospitality' ? 'Per completed order' : 'Per completed sale', icon: CreditCard }
      : { label: experience.metricLabels[2], value: formatCurrency(overview.today.operatingPosition, currency), detail: 'Sales less expenses', icon: ReceiptText },
    ...(hasInventory && commerceMetrics
      ? experience.kind === 'hospitality'
        ? [{ label: experience.metricLabels[3], value: formatNumber(overview.records.products), detail: 'Available menu items', icon: Package }]
        : [{ label: experience.metricLabels[3], value: formatNumber(overview.records.lowStock), detail: `${overview.records.outOfStock} out of stock`, icon: CircleAlert }]
      : hasInventory ? [{ label: 'Stock alerts', value: formatNumber(overview.records.lowStock), detail: `${overview.records.outOfStock} out of stock`, icon: CircleAlert }] : []),
    ...(!hasInventory && hasCustomers ? [{ label: 'Customer records', value: formatNumber(overview.records.customers), detail: 'Available in this workspace', icon: UsersRound }] : []),
    ...(!hasInventory && !hasCustomers ? [{ label: 'Locations', value: formatNumber(overview.records.branches), detail: 'Active business locations', icon: Building2 }] : []),
  ]

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 pb-10">
      <header className="flex flex-col gap-4 py-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#697386]">
            <span>{experience.label}</span><span aria-hidden="true">/</span><span className="text-[#050a1f]">Overview</span>
          </div>
          <h1 className="mt-2 text-[1.7rem] font-bold tracking-[-0.035em] text-[#050a1f] sm:text-[2rem]">{organizationName}</h1>
          <p className="mt-1 text-sm text-[#667085]">{firstName ? `Welcome back, ${firstName}. ` : ''}{experience.overviewDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href} className={action.primary ? 'inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#ffda32] px-4 text-sm font-bold text-[#050a1f] shadow-sm outline-none transition-colors hover:bg-[#f0c900] focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2' : 'inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d9dde5] bg-white px-4 text-sm font-semibold text-[#172033] outline-none transition-colors hover:border-[#b9c0cc] hover:bg-[#f8f9fb] focus-visible:ring-2 focus-visible:ring-[#ffda32]'}>
                <Icon className="h-4 w-4" aria-hidden="true" />{action.label}
              </Link>
            )
          })}
        </div>
      </header>

      {/* Quick Actions Section */}
      <QuickActions actions={availableActions.map((action) => ({ 
        id: action.id, 
        label: action.label, 
        description: action.description, 
        href: action.href, 
        icon: <action.icon className="h-5 w-5" />, 
        primary: action.primary 
      }))} />

      <section aria-label="Today's operating metrics" className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className="relative px-5 py-4 sm:min-h-[132px] sm:px-6 sm:py-5 [&:not(:last-child)]:border-b sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(-n+2)]:border-b xl:[&:not(:last-child)]:border-r xl:[&:not(:last-child)]:border-b-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[0.78rem] font-semibold text-[#667085]">{metric.label}</p>
                  <Icon className="h-[18px] w-[18px] text-[#8b95a7]" aria-hidden="true" />
                </div>
                <p className="mt-3 text-[1.55rem] font-bold tabular-nums tracking-[-0.035em] text-[#050a1f]">{metric.value}</p>
                <p className="mt-1 text-xs text-[#8a94a5]">{metric.detail}</p>
                {index === 0 && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#ffda32]" aria-hidden="true" />}
              </article>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,.72fr)]">
        <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <div className="flex flex-col gap-3 border-b border-[#edf0f4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-[0.95rem] font-bold text-[#101828]">Operating performance</h2>
              <p className="mt-1 text-xs text-[#7b8495]">Sales and recorded expenses · Last 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-[#667085]">
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#e42527]" />Sales</span>
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm bg-[#ffda32]" />Expenses</span>
              <Link href="/dashboard/reports" className="ml-1 font-semibold text-[#172033] hover:underline">Reports</Link>
            </div>
          </div>
          <div className="px-2 pb-2 pt-4 sm:px-5"><OperatingChart data={overview.revenueSeries} currency={currency} /></div>
        </article>

        <aside className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <div className="border-b border-[#edf0f4] px-5 py-4">
            <div className="flex items-center justify-between gap-3"><div><h2 className="text-[0.95rem] font-bold text-[#101828]">Month to date</h2><p className="mt-1 text-xs text-[#7b8495]">Current operating position</p></div><span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-[#667085]"><i className="h-2 w-2 rounded-full bg-[#e42527]" />Live</span></div>
          </div>
          <dl className="divide-y divide-[#edf0f4] px-5">
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
      </section>

      <section className={cn('grid gap-4', hasInventory && 'xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]')}>
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

      <section className={cn('grid gap-4', hasProducts && 'xl:grid-cols-2')}>
        {hasProducts && <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <SectionHeader title="Top products" description="Ranked by sales value this month." />
          {overview.topProducts.length ? <ol className="divide-y divide-[#edf0f4] px-5">{overview.topProducts.map((item, index) => <li key={item.name} className="flex items-center gap-4 py-3.5"><span className="w-5 text-xs font-semibold tabular-nums text-[#a0a8b7]">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#101828]">{item.name}</p><p className="mt-0.5 text-xs text-[#8a94a5]">{formatNumber(item.quantity)} units sold</p></div><p className="text-sm font-semibold tabular-nums text-[#101828]">{formatCurrency(item.revenue, currency)}</p></li>)}</ol> : <EmptyState message="No product ranking yet" detail="Top products appear after completed sales." href={saleHref} action="Open sales" />}
        </article>}

        <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
          <SectionHeader title="Payment mix" description="Completed sales this month." />
          {overview.paymentMix.length ? <div className="space-y-4 px-5 py-5">{overview.paymentMix.slice(0, 5).map((item) => <div key={item.method}><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-[#101828]">{methodLabel(item.method)}</span><span className="text-xs text-[#8a94a5]">{item.transactions}</span></div><p className="text-sm font-semibold tabular-nums text-[#101828]">{formatCurrency(item.amount, currency)}</p></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef0f4]"><div className="h-full rounded-full bg-[#ffda32]" style={{ width: `${Math.max((item.amount / maxPayment) * 100, 4)}%` }} /></div></div>)}</div> : <EmptyState message="No payment activity yet" detail="Payment methods will be compared after completed sales." href="/dashboard/pos" action="Open POS" />}
        </article>
      </section>

      {/* Additional Widgets Section */}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(330px,.75fr)]">
        {/* Left Column - Activity Feed and Tasks */}
        <div className="space-y-4">
          {actionTasks.length > 0 && <ActionTasks tasks={actionTasks} />}
          <ActivityFeed activities={activityItems} />
        </div>

        {/* Right Column - Alerts and Goals */}
        <div className="space-y-4">
          {outstandingPayments.length > 0 && <OutstandingPayments payments={outstandingPayments} currency={currency} />}
          {performanceGoals.length > 0 && <PerformanceGoals goals={performanceGoals} currency={currency} />}
          {onboardingSteps.length > 0 && <OnboardingChecklist steps={onboardingSteps} />}
        </div>
      </section>
    </div>
  )
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-4"><dt className="text-sm text-[#667085]">{label}</dt><dd className={emphasis ? 'text-base font-bold tabular-nums text-[#050a1f]' : 'text-sm font-semibold tabular-nums text-[#101828]'}>{value}</dd></div>
}

function MiniRecord({ label, value, href }: { label: string; value: string; href: string }) {
  return <Link href={href} className="border-r border-[#edf0f4] px-2 py-3 text-center last:border-r-0 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e42527]"><span className="block text-sm font-bold tabular-nums text-[#101828]">{value}</span><span className="mt-0.5 block text-[0.67rem] text-[#8a94a5]">{label}</span></Link>
}

function SectionHeader({ title, description, href }: { title: string; description: string; href?: string }) {
  return <div className="flex items-center justify-between gap-4 border-b border-[#edf0f4] px-5 py-4 sm:px-6"><div><h2 className="text-[0.95rem] font-bold text-[#101828]">{title}</h2><p className="mt-1 text-xs text-[#7b8495]">{description}</p></div>{href && <Link href={href} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#344054] hover:text-[#e42527]">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}</div>
}

function EmptyState({ message, detail, href, action, icon = 'receipt' }: { message: string; detail: string; href: string; action: string; icon?: 'receipt' | 'stock' }) {
  const Icon = icon === 'stock' ? PackageOpen : ReceiptText
  return <div className="flex min-h-48 flex-col items-center justify-center px-6 py-8 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3f5f7] text-[#7b8495]"><Icon className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-[#101828]">{message}</p><p className="mt-1 max-w-xs text-xs leading-5 text-[#8a94a5]">{detail}</p><Link href={href} className="mt-4 text-xs font-semibold text-[#e42527] hover:underline">{action}</Link></div>
}
