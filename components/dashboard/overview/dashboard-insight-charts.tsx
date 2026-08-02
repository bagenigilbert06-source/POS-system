'use client'

import Link from 'next/link'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, BarChart3, PackageOpen, WalletCards } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

type Payment = { method: string; amount: number; transactions: number }
type Product = { name: string; quantity: number; revenue: number }

interface DashboardInsightChartsProps {
  currency: string
  paymentMix: Payment[]
  topProducts: Product[]
  stock: { healthy: number; low: number; out: number }
  productLabel?: string
}

const COLORS = ['#e42527', '#ffda32', '#172033', '#6b7280', '#d97706']

const label = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function ChartCard({ title, description, href, children }: { title: string; description: string; href?: string; children: React.ReactNode }) {
  return <article className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_1px_2px_rgba(16,24,40,.03)]">
    <div className="flex items-center justify-between gap-4 border-b border-[var(--dashboard-border)] px-5 py-4">
      <div><h2 className="text-[0.95rem] font-bold text-[var(--dashboard-text)]">{title}</h2><p className="mt-1 text-xs text-[var(--dashboard-muted)]">{description}</p></div>
      {href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--dashboard-text)] hover:text-[#e42527]">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
    </div>
    {children}
  </article>
}

function EmptyChart({ icon: Icon, title, detail, href }: { icon: typeof BarChart3; title: string; detail: string; href: string }) {
  return <div className="flex h-[260px] flex-col items-center justify-center px-6 text-center"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]"><Icon className="h-5 w-5" /></span><p className="mt-3 text-sm font-semibold text-[var(--dashboard-text)]">{title}</p><p className="mt-1 max-w-xs text-xs leading-5 text-[var(--dashboard-muted)]">{detail}</p><Link href={href} className="mt-4 text-xs font-semibold text-[#e42527] hover:underline">Get started</Link></div>
}

export function DashboardInsightCharts({ currency, paymentMix, topProducts, stock, productLabel = 'products' }: DashboardInsightChartsProps) {
  const payments = paymentMix.slice(0, 5).map((item) => ({ ...item, label: label(item.method) }))
  const products = topProducts.slice(0, 6).map((item) => ({ ...item, shortName: item.name.length > 18 ? `${item.name.slice(0, 17)}…` : item.name }))
  const stockData = [
    { name: 'Healthy', value: Math.max(stock.healthy, 0), color: '#16a36a' },
    { name: 'Low', value: stock.low, color: '#ffda32' },
    { name: 'Out', value: stock.out, color: '#e42527' },
  ].filter((item) => item.value > 0)

  return <section aria-label="Business insight charts" className="grid gap-4 xl:grid-cols-3">
    <ChartCard title="Payment mix" description="Sales value by payment method this month." href="/dashboard/reports">
      {payments.length ? <div className="grid h-[290px] grid-cols-[minmax(0,1fr)_120px] items-center px-3 py-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={payments} dataKey="amount" nameKey="label" innerRadius="56%" outerRadius="82%" paddingAngle={3} stroke="none" isAnimationActive={false}>{payments.map((item, index) => <Cell key={item.method} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value), currency)} contentStyle={{ borderRadius: 10, border: '1px solid var(--dashboard-border)', background: 'var(--dashboard-chart-tooltip)', fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="space-y-3">{payments.map((item, index) => <div key={item.method}><div className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} /><span className="truncate text-xs font-semibold text-[var(--dashboard-text)]">{item.label}</span></div><p className="ml-[18px] mt-0.5 text-[0.68rem] text-[var(--dashboard-muted)]">{item.transactions} sales</p></div>)}</div></div> : <EmptyChart icon={WalletCards} title="No payment data yet" detail="Cash, M-Pesa, card and bank sales will be compared here." href="/dashboard/pos" />}
    </ChartCard>

    <ChartCard title={`Top ${productLabel}`} description="Best sellers by revenue this month." href="/dashboard/reports">
      {products.length ? <div className="h-[290px] px-3 py-5"><ResponsiveContainer width="100%" height="100%"><BarChart data={products} layout="vertical" margin={{ left: 4, right: 16 }}><CartesianGrid horizontal={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="2 4" /><XAxis type="number" hide /><YAxis type="category" dataKey="shortName" width={105} axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} /><Tooltip formatter={(value, name) => [name === 'revenue' ? formatCurrency(Number(value), currency) : formatNumber(Number(value)), name === 'revenue' ? 'Revenue' : 'Units']} contentStyle={{ borderRadius: 10, border: '1px solid var(--dashboard-border)', background: 'var(--dashboard-chart-tooltip)', fontSize: 12 }} /><Bar dataKey="revenue" fill="#e42527" radius={[0, 5, 5, 0]} maxBarSize={22} isAnimationActive={false} /></BarChart></ResponsiveContainer></div> : <EmptyChart icon={BarChart3} title="No product ranking yet" detail={`Your fastest-moving ${productLabel} will appear after completed sales.`} href="/dashboard/pos" />}
    </ChartCard>

    <ChartCard title="Stock health" description="Active catalogue availability right now." href="/dashboard/inventory">
      {stockData.length ? <div className="grid h-[290px] grid-cols-[minmax(0,1fr)_120px] items-center px-3 py-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stockData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="82%" stroke="none" isAnimationActive={false}>{stockData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => formatNumber(Number(value))} contentStyle={{ borderRadius: 10, border: '1px solid var(--dashboard-border)', background: 'var(--dashboard-chart-tooltip)', fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="space-y-3">{stockData.map((item) => <div key={item.name} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs text-[var(--dashboard-muted)]"><i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.name}</span><strong className="text-xs tabular-nums text-[var(--dashboard-text)]">{item.value}</strong></div>)}</div></div> : <EmptyChart icon={PackageOpen} title="Catalogue is empty" detail={`Add your first ${productLabel} and opening stock to activate inventory health.`} href="/dashboard/products" />}
    </ChartCard>
  </section>
}
