'use client'

import { memo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'

type Analytics = Awaited<ReturnType<typeof import('@/app/actions/sales').getSalesAnalytics>>
const COLORS = ['#f9b21d', '#16a34a', '#2563eb', '#e42527', '#7c3aed']
const PAYMENT_METHODS = [
  { label: 'cash', display: 'Cash' },
  { label: 'mpesa', display: 'M-Pesa' },
  { label: 'card', display: 'Card' },
] as const

export const SalesAnalyticsPanels = memo(function SalesAnalyticsPanels({ analytics }: { analytics: Analytics }) {
  const paymentValues = new Map(analytics.payments.map((item) => [String(item.label).toLowerCase(), Number(item.value)]))
  const payments = PAYMENT_METHODS.map((method, index) => ({ label: method.label, display: method.display, value: paymentValues.get(method.label) ?? 0, color: COLORS[index], icon: method.label === 'cash' ? 'C' : method.label === 'mpesa' ? 'M' : 'V' })).sort((a, b) => b.value - a.value)
  const paymentTotal = payments.reduce((total, item) => total + item.value, 0)
  return <section className="grid min-w-0 gap-5 lg:grid-cols-2">
    <Panel title="Sales trend"><SalesTrendChart data={analytics.trend} /></Panel>
    <Panel title="Payment mix"><div className="flex items-start justify-between gap-3"><p className="text-[11px] text-muted-foreground">Sales value by payment method for selected period</p><div className="flex shrink-0 flex-col items-end gap-1 rounded-lg border border-[#ead48d] bg-[#fff8e8] px-3 py-2 text-right dark:border-[#80651d] dark:bg-[#30270f]"><span className="text-[8px] font-bold uppercase leading-none tracking-[.14em] text-[#9a6900] dark:text-[#f5c542]">Total</span><span className="text-xs font-bold leading-none tabular-nums text-[#111827] dark:text-slate-100">{formatCurrency(paymentTotal)}</span></div></div><div className="mt-4 h-36"><ResponsiveContainer width="100%" height="100%" debounce={80}><BarChart layout="vertical" data={payments} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="display" width={62} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.35)' }} formatter={(value) => [formatCurrency(Number(value)), 'Sales']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', boxShadow: '0 10px 24px rgba(0,0,0,.24)' }} labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 4 }} itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }} /><Bar dataKey="value" name="Sales" minPointSize={4} radius={[0, 5, 5, 0]} barSize={18} isAnimationActive={false}>{payments.map((item) => <Cell key={item.label} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">{payments.map((item) => { const share = paymentTotal ? item.value / paymentTotal * 100 : 0; return <div key={item.label} className="min-w-0"><span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.display}</span><b className="mt-1 block truncate text-xs tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(item.value)}</b><span className="text-[10px] text-muted-foreground">{share < 0.05 && share > 0 ? '<0.1' : share.toFixed(1)}%</span></div> })}</div></Panel>
    <Table title="Top products" rows={analytics.products} columns={['Product', 'Qty', 'Revenue', 'Profit']} />
    <Table title="Top cashiers" rows={analytics.cashiers} columns={['Cashier', 'Sales', 'Revenue']} />
    <div className="lg:col-span-2"><Table title="Top customers" rows={analytics.customers} columns={['Customer', 'Orders', 'Revenue']} /></div>
  </section>
})

function SalesTrendChart({ data }: { data: Analytics['trend'] }) {
  const formatDay = (value: number) => new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
  const compactAmount = (value: number) => new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  const tooltipStyle = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', boxShadow: '0 10px 24px rgba(0,0,0,.18)' }

  if (!data.length) {
    return <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground sm:h-64">No sales recorded for this period.</div>
  }

  if (data.length === 1) {
    return (
      <div className="h-56 min-w-0 sm:h-64" role="img" aria-label={`Sales on ${formatDay(data[0].timestamp)} were ${formatCurrency(data[0].value)}`}>
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <BarChart data={data} margin={{ left: 8, right: 16, top: 16, bottom: 4 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={formatDay} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
            <YAxis width={54} tickFormatter={compactAmount} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={(value) => formatDay(Number(value))} formatter={(value) => [formatCurrency(Number(value)), 'Sales']} cursor={{ fill: 'hsl(var(--muted) / 0.2)' }} contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 4 }} itemStyle={{ color: '#b7791f', fontWeight: 600 }} />
            <Bar dataKey="value" name="Sales" fill="#f9b21d" radius={[8, 8, 2, 2]} maxBarSize={72} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-56 min-w-0 sm:h-64" role="img" aria-label={`Sales trend across ${data.length} days`}>
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <LineChart data={data} margin={{ left: 8, right: 16, top: 16, bottom: 4 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis type="number" dataKey="timestamp" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatDay} minTickGap={28} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
          <YAxis width={54} tickFormatter={compactAmount} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={(value) => formatDay(Number(value))} formatter={(value) => [formatCurrency(Number(value)), 'Sales']} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 4 }} itemStyle={{ color: '#b7791f', fontWeight: 600 }} />
          <Line type="monotone" dataKey="value" name="Sales" stroke="#d97706" strokeWidth={2.5} dot={data.length <= 14 ? { r: 3, fill: '#f9b21d', stroke: 'hsl(var(--card))', strokeWidth: 1.5 } : false} activeDot={{ r: 5, fill: '#f9b21d', stroke: 'hsl(var(--card))', strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111111]"><h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2><div className="mt-4">{children}</div></div> }
function Table({ title, rows, columns }: { title: string; rows: Array<{ label: string | null; value: number; quantity: number; profit?: number }>; columns: string[] }) { return <Panel title={title}>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[360px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{columns.map((column) => <th key={column} className="pb-2 font-medium">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.label}-${index}`} className="border-t border-slate-200 dark:border-slate-800"><td className="py-2 font-medium text-slate-900 dark:text-slate-100">{row.label ?? 'Unassigned'}</td><td className="py-2 text-slate-700 dark:text-slate-300">{row.quantity}</td><td className="py-2 text-slate-700 dark:text-slate-300">{formatCurrency(row.value)}</td>{columns.length === 4 && <td className="py-2 text-slate-700 dark:text-slate-300">{formatCurrency(row.profit ?? 0)}</td>}</tr>)}</tbody></table></div> : <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-muted-foreground dark:border-slate-700 dark:bg-slate-900/40">No {title.toLowerCase()} data for this selected period.</div>}</Panel> }
