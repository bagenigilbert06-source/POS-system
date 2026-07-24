'use client'

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils/format'

interface TrendAnalysisProps {
  data: { date: string; revenue: number; transactions: number }[]
  currency: string
}

function compact(value: number) {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (absolute >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return String(value)
}

export function TrendAnalysis({ data, currency }: TrendAnalysisProps) {
  if (!data.length) {
    return (
      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5">
          <h2 className="font-bold">Revenue trend</h2>
          <p className="mt-1 text-sm text-muted-foreground">30-day sales trend analysis</p>
        </div>
        <div className="flex h-[280px] items-center justify-center text-center">
          <div><p className="text-sm font-semibold">No data available</p><p className="text-xs text-muted-foreground mt-1">Trend data will appear after sales are recorded</p></div>
        </div>
      </article>
    )
  }

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <h2 className="font-bold">Revenue trend</h2>
        <p className="mt-1 text-sm text-muted-foreground">30-day sales trend analysis</p>
      </div>
      <div className="h-[280px] px-2 pb-3 pt-5 sm:h-[320px] sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }} tickFormatter={compact} />
            <Tooltip 
              cursor={{ fill: 'var(--dashboard-surface-subtle)' }} 
              contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 10, boxShadow: '0 12px 28px rgb(0 0 0 / .18)', fontSize: 12 }}
              formatter={(value) => [formatCurrency(Number(value), currency), 'Revenue']}
            />
            <Line type="monotone" dataKey="revenue" stroke="var(--dashboard-chart-revenue)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
