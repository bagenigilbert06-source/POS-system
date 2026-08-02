'use client'

import Link from 'next/link'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowRight, ArrowUpRight, Boxes, CalendarDays, CircleDollarSign, CreditCard, ReceiptText, ShoppingBag, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'
import type { DashboardOverview } from '@/lib/services/dashboard-overview-service'

type Metric = {
  label: string
  value: string
  detail: string
  icon: typeof TrendingUp
  href: string
  featured?: boolean
}

function paymentLabel(method: string) {
  return method.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function POSOperationsDashboard({ currency, overview, saleHref }: { currency: string; overview: DashboardOverview; saleHref: string }) {
  const hasSales = overview.recentSales.length > 0
  const sales = overview.revenueSeries.slice(-7).map((item) => ({
    ...item,
    label: new Date(`${item.date}T12:00:00`).toLocaleDateString('en-KE', { weekday: 'short' }),
  }))
  const totalOrders = overview.today.transactions
  const averageOrder = totalOrders ? overview.today.revenue / totalOrders : 0
  const paymentTotal = overview.paymentMix.reduce((sum, method) => sum + method.amount, 0)
  const monthOrders = overview.paymentMix.reduce((sum, method) => sum + method.transactions, 0)
  const topPayment = overview.paymentMix[0]
  const metrics: Metric[] = [
    { label: 'Total income', value: formatCurrency(overview.today.revenue, currency), detail: 'Today', icon: TrendingUp, href: '/dashboard/sales', featured: true },
    { label: 'Net profit', value: formatCurrency(overview.today.operatingPosition, currency), detail: 'Sales less expenses', icon: CircleDollarSign, href: '/dashboard/reports' },
    { label: 'Total orders', value: formatNumber(totalOrders), detail: `Average ${formatCurrency(averageOrder, currency)}`, icon: ReceiptText, href: '/dashboard/sales' },
    { label: 'Total expense', value: formatCurrency(overview.today.expenses, currency), detail: 'Today', icon: CreditCard, href: '/dashboard/expenses' },
  ]

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#7b8270]">Sales analytics</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-[#151514] sm:text-3xl">Welcome back</h1>
          <p className="mt-1 text-sm text-[#74776f]">Here&apos;s how your store is performing today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#e2e6dc] bg-white px-3 text-xs font-semibold text-[#5c6359]"><CalendarDays className="h-4 w-4" />Today</span>
          <Link href={saleHref} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#b9ef43] px-4 text-sm font-bold text-[#171717] shadow-[0_8px_18px_rgba(130,177,35,.2)] transition hover:bg-[#a7dc36]"><ShoppingBag className="h-4 w-4" />New sale</Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Today’s key metrics">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.7fr)]">
        <article className="overflow-hidden rounded-2xl bg-[#1d1d2d] p-5 text-white shadow-[0_14px_38px_rgba(29,29,45,.16)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/60">Today&apos;s revenue</p>
              <p className="mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">{formatCurrency(overview.today.revenue, currency)}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#b9ef43]"><ArrowUpRight className="h-3.5 w-3.5" />{totalOrders ? `${formatNumber(totalOrders)} completed orders` : 'Ready for your first order'}</p>
            </div>
            <Link href="/dashboard/reports" className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-[#b9ef43]/70 hover:text-[#b9ef43]">View report <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="mt-7 h-[220px] sm:h-[252px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sales} margin={{ left: -14, right: 5, top: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,.12)" strokeDasharray="3 5" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,.56)', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,.56)', fontSize: 10 }} tickFormatter={(value) => new Intl.NumberFormat('en-KE', { notation: 'compact' }).format(value)} />
                <Tooltip contentStyle={{ border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, background: '#29293c', color: '#fff', fontSize: 12 }} formatter={(value) => formatCurrency(Number(value), currency)} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="rgba(255,255,255,.48)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revenue" name="Sales" stroke="#b9ef43" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#b9ef43', stroke: '#1d1d2d', strokeWidth: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#b9ef43]" />Sales</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-white/45" />Expenses</span><span className="ml-auto font-medium text-white/50">Last 7 days</span></div>
        </article>

        <aside className="rounded-2xl border border-[#e1e6db] bg-white p-5 shadow-[0_8px_24px_rgba(35,37,34,.05)]">
          <div className="flex items-center justify-between"><div><h2 className="font-bold text-[#151514]">Payment overview</h2><p className="mt-1 text-xs text-[#74776f]">This month&apos;s sales mix</p></div><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#efffd0] text-[#557b14]"><CreditCard className="h-4 w-4" /></span></div>
          {topPayment ? <><div className="mt-7 rounded-xl bg-[#f5f7f1] p-4"><p className="text-xs font-medium text-[#74776f]">Most used method</p><p className="mt-1 text-lg font-bold text-[#151514]">{paymentLabel(topPayment.method)}</p><p className="mt-1 text-xs text-[#6b8d22]">{paymentTotal ? Math.round((topPayment.amount / paymentTotal) * 100) : 0}% of sales value</p></div><div className="mt-5 space-y-3">{overview.paymentMix.slice(0, 4).map((method) => { const percentage = paymentTotal ? Math.round((method.amount / paymentTotal) * 100) : 0; return <div key={method.method}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="truncate font-medium text-[#53584f]">{paymentLabel(method.method)}</span><span className="font-semibold text-[#151514]">{percentage}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#edf0e8]"><div className="h-full rounded-full bg-[#b9ef43]" style={{ width: `${percentage}%` }} /></div></div> })}</div></> : <EmptyCopy text="Payment insights will appear after completed sales." />}
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="rounded-2xl border border-[#e1e6db] bg-white p-5 shadow-[0_8px_24px_rgba(35,37,34,.05)]"><SectionTitle title="Top selling products" description="Best performers by quantity sold" href="/dashboard/reports" />{overview.topProducts.length ? <div className="mt-4 h-[225px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.topProducts.slice(0, 5)} layout="vertical" margin={{ left: 8, right: 16 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={115} axisLine={false} tickLine={false} tick={{ fill: '#5c6359', fontSize: 11 }} /><Tooltip cursor={{ fill: '#f4f6f0' }} contentStyle={{ border: '1px solid #e1e6db', borderRadius: 10, fontSize: 12 }} /><Bar dataKey="quantity" name="Units sold" fill="#b9ef43" radius={[0, 6, 6, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer></div> : <EmptyCopy text="Top products will appear after completed sales." />}</article>
        <article className="rounded-2xl border border-[#e1e6db] bg-white p-5 shadow-[0_8px_24px_rgba(35,37,34,.05)]"><SectionTitle title="Recent transactions" description="Latest completed sales" href="/dashboard/sales" />{hasSales ? <div className="mt-3 divide-y divide-[#edf0e8]">{overview.recentSales.slice(0, 5).map((sale) => <Link key={sale.id} href="/dashboard/sales" className="flex items-center justify-between gap-4 py-3 transition hover:px-1"><span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f3f5ef] text-[#557b14]"><ReceiptText className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#20211f]">{sale.receiptNo}</span><span className="mt-0.5 block text-xs text-[#74776f]">{paymentLabel(sale.paymentMethod)}</span></span></span><strong className="shrink-0 text-sm text-[#20211f]">{formatCurrency(sale.total, currency)}</strong></Link>)}</div> : <EmptyCopy text="Completed transactions will appear here." />}</article>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <CompactCard icon={Boxes} label="Products" value={formatNumber(overview.records.products)} detail="Active catalogue items" href="/dashboard/products" />
        <CompactCard icon={AlertTriangle} label="Low stock alerts" value={formatNumber(overview.records.lowStock)} detail={overview.records.lowStock ? 'Products need attention' : 'Stock levels look healthy'} href="/dashboard/inventory" warning={overview.records.lowStock > 0} />
        <CompactCard icon={ShoppingBag} label="Orders this month" value={formatNumber(monthOrders)} detail="Completed transactions" href="/dashboard/sales" />
      </section>
    </div>
  )
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon
  return <Link href={metric.href} className={metric.featured ? 'rounded-2xl bg-[#1d1d2d] p-4 text-white shadow-[0_10px_24px_rgba(29,29,45,.14)] transition hover:-translate-y-0.5' : 'rounded-2xl border border-[#e1e6db] bg-white p-4 shadow-[0_8px_20px_rgba(35,37,34,.04)] transition hover:-translate-y-0.5 hover:shadow-md'}><div className="flex items-start justify-between gap-3"><p className={metric.featured ? 'text-xs font-medium text-white/60' : 'text-xs font-medium text-[#74776f]'}>{metric.label}</p><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#b9ef43] text-[#1d1d2d]"><Icon className="h-4 w-4" /></span></div><p className={metric.featured ? 'mt-5 text-xl font-bold tracking-[-0.03em]' : 'mt-5 text-xl font-bold tracking-[-0.03em] text-[#151514]'}>{metric.value}</p><p className={metric.featured ? 'mt-1 text-xs text-[#b9ef43]' : 'mt-1 text-xs text-[#758c42]'}>{metric.detail}</p></Link>
}

function SectionTitle({ title, description, href }: { title: string; description: string; href: string }) {
  return <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-[#151514]">{title}</h2><p className="mt-1 text-xs text-[#74776f]">{description}</p></div><Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#557b14] hover:text-[#3f5b0e]">View all <ArrowRight className="h-3.5 w-3.5" /></Link></div>
}

function CompactCard({ icon: Icon, label, value, detail, href, warning = false }: { icon: typeof Boxes; label: string; value: string; detail: string; href: string; warning?: boolean }) {
  return <Link href={href} className="flex items-center gap-3 rounded-xl border border-[#e1e6db] bg-white p-4 transition hover:border-[#cdd8bd] hover:shadow-sm"><span className={warning ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff3dc] text-[#bf7919]' : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#efffd0] text-[#557b14]'}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs text-[#74776f]">{label}</span><strong className="mt-0.5 block text-lg leading-5 text-[#151514]">{value}</strong><span className="mt-0.5 block truncate text-xs text-[#74776f]">{detail}</span></span></Link>
}

function EmptyCopy({ text }: { text: string }) {
  return <div className="flex min-h-[170px] items-center justify-center text-center text-sm text-[#74776f]">{text}</div>
}
