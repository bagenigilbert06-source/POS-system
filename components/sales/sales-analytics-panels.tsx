'use client'

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'

type Analytics = Awaited<ReturnType<typeof import('@/app/actions/sales').getSalesAnalytics>>

export function SalesAnalyticsPanels({ analytics }: { analytics: Analytics }) {
  return <section className="grid gap-5 xl:grid-cols-2">
    <Panel title="Sales trend"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Line type="monotone" dataKey="value" stroke="#e42527" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Panel>
    <Panel title="Payment mix"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.payments}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Bar dataKey="value" fill="#f9b21d" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></Panel>
    <Table title="Top products" rows={analytics.products} columns={['Product', 'Qty', 'Revenue', 'Profit']} />
    <Table title="Top cashiers" rows={analytics.cashiers} columns={['Cashier', 'Sales', 'Revenue']} />
    <Table title="Top customers" rows={analytics.customers} columns={['Customer', 'Orders', 'Revenue']} />
  </section>
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="text-sm font-semibold">{title}</h2><div className="mt-4">{children}</div></div> }
function Table({ title, rows, columns }: { title: string; rows: Array<{ label: string | null; value: number; quantity: number; profit?: number }>; columns: string[] }) { return <Panel title={title}><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr>{columns.map((column) => <th key={column} className="pb-2 font-medium">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.label}-${index}`} className="border-t"><td className="py-2 font-medium">{row.label ?? 'Unassigned'}</td><td className="py-2">{row.quantity}</td><td className="py-2">{formatCurrency(row.value)}</td>{columns.length === 4 && <td className="py-2">{formatCurrency(row.profit ?? 0)}</td>}</tr>)}</tbody></table></div></Panel> }
