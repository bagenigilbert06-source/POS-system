'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ShoppingBag, Percent } from 'lucide-react'

interface RepeatData {
  visits: string
  count: number
  percentage: number
}

interface RepeatCustomersProps {
  data: RepeatData[]
}

export function RepeatCustomers({ data }: RepeatCustomersProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0)
  if (!total) {
    return (
      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2>Repeat customers</h2><p className="mt-1 text-xs text-muted-foreground">Customer purchase frequency</p></div>
            <ShoppingBag className="h-4 w-4 text-[var(--dashboard-accent)]" />
          </div>
        </div>
        <div className="flex h-[220px] items-center justify-center text-center">
          <div><p className="text-sm font-semibold">No repeat data</p><p className="text-xs text-muted-foreground mt-1">Analyze after multiple customer purchases</p></div>
        </div>
      </article>
    )
  }

  const summary = data.map((d) => `${d.visits}: ${d.count} customers (${d.percentage}%)`).join('; ')
  const repeatRate = data.filter((row) => row.visits !== '1 visit').reduce((sum, row) => sum + row.count, 0) / total * 100
  const colors = ['var(--dashboard-chart-grid)', 'var(--dashboard-chart-secondary)', 'var(--dashboard-accent-cta)', 'var(--dashboard-danger)']

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2>Repeat customers</h2><p className="mt-1 text-xs text-muted-foreground">Customer purchase frequency</p></div>
          <span className="inline-flex items-center gap-1 rounded-md bg-[var(--dashboard-success-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--dashboard-success)]"><Percent className="h-3 w-3" />{repeatRate.toFixed(1)}% repeat</span>
        </div>
      </div>
      <p className="sr-only">Repeat customer summary: {summary}</p>
      <div className="grid min-h-[260px] items-center gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_190px] sm:p-5">
        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="visits" innerRadius={62} outerRadius={88} paddingAngle={2} stroke="none" isAnimationActive={false}>{data.map((row, index) => <Cell key={row.visits} fill={colors[index % colors.length]} />)}</Pie>
              <Tooltip contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 8, fontSize: 11 }} formatter={(value) => [Number(value).toLocaleString('en-KE'), 'Customers']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-semibold tabular-nums">{total.toLocaleString('en-KE')}</span><span className="text-[10px] text-muted-foreground">customers</span></div>
        </div>
        <div className="space-y-3">{data.map((row, index) => <div key={row.visits} className="flex items-center gap-2 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="text-muted-foreground">{row.visits}</span><strong className="ml-auto tabular-nums">{row.percentage}%</strong></div>)}</div>
      </div>
    </article>
  )
}
