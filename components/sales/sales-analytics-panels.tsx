'use client'

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'

type Analytics = Awaited<ReturnType<typeof import('@/app/actions/sales').getSalesAnalytics>>
const COLORS = ['#f9b21d', '#16a34a', '#2563eb', '#e42527', '#7c3aed']
const PAYMENT_METHODS = [
  { label: 'cash', display: 'Cash' },
  { label: 'mpesa', display: 'M-Pesa' },
  { label: 'card', display: 'Card' },
] as const

export function SalesAnalyticsPanels({ analytics }: { analytics: Analytics }) {
  const paymentValues = new Map(analytics.payments.map((item) => [String(item.label).toLowerCase(), Number(item.value)]))
  const payments = PAYMENT_METHODS.map((method, index) => ({ label: method.label, display: method.display, value: paymentValues.get(method.label) ?? 0, color: COLORS[index], icon: method.label === 'cash' ? 'C' : method.label === 'mpesa' ? 'M' : 'V' })).sort((a, b) => b.value - a.value)
  const paymentTotal = payments.reduce((total, item) => total + item.value, 0)
  const formatDay = (value: number) => new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
  return <section className="grid min-w-0 gap-5 lg:grid-cols-2">
    <Panel title="Sales trend"><div className="h-56 min-w-0 sm:h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.trend} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" dataKey="timestamp" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatDay} tick={{ fontSize: 10 }} /><YAxis width={42} tick={{ fontSize: 10 }} /><Tooltip labelFormatter={(value) => formatDay(Number(value))} formatter={(value) => formatCurrency(Number(value))} /><Line type="linear" dataKey="value" stroke="#e42527" strokeWidth={2} dot={false} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></Panel>
    <Panel title="Payment mix"><div className="flex items-start justify-between gap-3"><p className="text-[11px] text-muted-foreground">Sales value by payment method for selected period</p><div className="shrink-0 rounded-lg border border-[#ead48d] bg-[#fff8e8] px-2.5 py-1.5 text-right"><span className="block text-[8px] font-bold uppercase tracking-[.14em] text-[#9a6900]">Total</span><span className="mt-0.5 block text-xs font-bold tabular-nums text-[#111827]">{formatCurrency(paymentTotal)}</span></div></div><div className="mt-4 h-36"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={payments} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="display" width={62} tick={{ fontSize: 11, fill: '#344054', fontWeight: 600 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#fff8e8' }} formatter={(value) => formatCurrency(Number(value))} /><Bar dataKey="value" minPointSize={4} radius={[0, 5, 5, 0]} barSize={18}>{payments.map((item) => <Cell key={item.label} fill={item.color} />)}</Bar></BarChart></ResponsiveContainer></div><div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">{payments.map((item) => { const share = paymentTotal ? item.value / paymentTotal * 100 : 0; return <div key={item.label} className="min-w-0"><span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.display}</span><b className="mt-1 block truncate text-xs tabular-nums text-slate-900">{formatCurrency(item.value)}</b><span className="text-[10px] text-muted-foreground">{share < 0.05 && share > 0 ? '<0.1' : share.toFixed(1)}%</span></div> })}</div></Panel>
    <Table title="Top products" rows={analytics.products} columns={['Product', 'Qty', 'Revenue', 'Profit']} />
    <Table title="Top cashiers" rows={analytics.cashiers} columns={['Cashier', 'Sales', 'Revenue']} />
    <div className="lg:col-span-2"><Table title="Top customers" rows={analytics.customers} columns={['Customer', 'Orders', 'Revenue']} /></div>
  </section>
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold">{title}</h2><div className="mt-4">{children}</div></div> }
function Table({ title, rows, columns }: { title: string; rows: Array<{ label: string | null; value: number; quantity: number; profit?: number }>; columns: string[] }) { return <Panel title={title}>{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[360px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{columns.map((column) => <th key={column} className="pb-2 font-medium">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.label}-${index}`} className="border-t"><td className="py-2 font-medium">{row.label ?? 'Unassigned'}</td><td className="py-2">{row.quantity}</td><td className="py-2">{formatCurrency(row.value)}</td>{columns.length === 4 && <td className="py-2">{formatCurrency(row.profit ?? 0)}</td>}</tr>)}</tbody></table></div> : <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs text-muted-foreground">No {title.toLowerCase()} data for this selected period.</div>}</Panel> }
