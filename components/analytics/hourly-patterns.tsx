'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface HourlyData {
  hour: string
  sales: number
  transactions: number
}

interface HourlyPatternsProps {
  data: HourlyData[]
  currency: string
}

function compact(value: number) {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (absolute >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return String(value)
}

export function HourlyPatterns({ data, currency }: HourlyPatternsProps) {
  if (!data.length) {
    return (
      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2>Hourly sales pattern</h2><p className="mt-1 text-xs text-muted-foreground">Completed sales by local hour</p></div>
            <Clock className="h-4 w-4 text-[var(--dashboard-accent)]" />
          </div>
        </div>
        <div className="flex h-[220px] items-center justify-center text-center">
          <div><p className="text-sm font-semibold">No hourly pattern yet</p><p className="mt-1 text-xs text-muted-foreground">Patterns appear as sales are recorded throughout the day.</p></div>
        </div>
      </article>
    )
  }

  const summary = data.map((d) => `${d.hour}: ${formatCurrency(d.sales, currency)}`).join('; ')
  const peak = data.reduce((best, row) => row.sales > best.sales ? row : best, data[0])

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2>Hourly sales pattern</h2><p className="mt-1 text-xs text-muted-foreground">Completed sales by local hour</p></div>
          <span className="rounded-md bg-[var(--dashboard-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--dashboard-accent)]">Peak {peak.hour}</span>
        </div>
      </div>
      <p className="sr-only">Hourly pattern summary: {summary}</p>
      <div className="h-[260px] px-2 pb-3 pt-5 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" />
            <XAxis dataKey="hour" axisLine={false} tickLine={false} minTickGap={18} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tickCount={4} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} tickFormatter={compact} />
            <Tooltip 
              cursor={{ fill: 'var(--dashboard-accent-soft)' }}
              contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 8, boxShadow: '0 12px 28px rgb(0 0 0 / .16)', fontSize: 11 }}
              formatter={(value, name) => name === 'sales' ? [formatCurrency(Number(value), currency), 'Sales'] : [value, 'Transactions']}
            />
            <Bar dataKey="sales" name="Sales" fill="var(--dashboard-chart-secondary)" radius={[3, 3, 0, 0]} maxBarSize={30} isAnimationActive={false}>{data.map((row) => <Cell key={row.hour} fill={row.hour === peak.hour ? 'var(--dashboard-accent-cta)' : 'var(--dashboard-chart-secondary)'} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
