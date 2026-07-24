'use client'

import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
            <div><h2 className="font-bold">Hourly sales pattern</h2><p className="mt-1 text-sm text-muted-foreground">Sales by hour of day</p></div>
            <Clock className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex h-[280px] items-center justify-center text-center">
          <div><p className="text-sm font-semibold">No hourly data</p><p className="text-xs text-muted-foreground mt-1">Patterns will appear after sales across different times</p></div>
        </div>
      </article>
    )
  }

  const summary = data.map((d) => `${d.hour}: ${formatCurrency(d.sales, currency)}`).join('; ')

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-bold">Hourly sales pattern</h2><p className="mt-1 text-sm text-muted-foreground">Sales by hour of day (daily average)</p></div>
          <Clock className="h-5 w-5 text-primary" />
        </div>
      </div>
      <p className="sr-only">Hourly pattern summary: {summary}</p>
      <div className="h-[280px] px-2 pb-3 pt-5 sm:h-[320px] sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--dashboard-chart-revenue-fill)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--dashboard-chart-revenue-fill)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" />
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }} tickFormatter={compact} />
            <Tooltip 
              cursor={{ fill: 'var(--dashboard-surface-subtle)' }} 
              contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 10, boxShadow: '0 12px 28px rgb(0 0 0 / .18)', fontSize: 12 }}
              formatter={(value, name) => name === 'sales' ? [formatCurrency(Number(value), currency), 'Sales'] : [value, 'Transactions']}
            />
            <Area type="monotone" dataKey="sales" stroke="var(--dashboard-chart-revenue)" fill="url(#hourlyGradient)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
