'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface TrendAnalysisProps {
  data: { date: string; revenue: number; transactions: number }[]
  currency: string
  days: number
}

function compact(value: number) {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (absolute >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return String(value)
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function TrendAnalysis({ data, currency, days }: TrendAnalysisProps) {
  if (!data.some((row) => row.revenue > 0 || row.transactions > 0)) {
    return (
      <article className="app-panel overflow-hidden">
        <div className="flex items-start justify-between border-b px-4 py-4 sm:px-5">
          <div><h2>Revenue trend</h2><p className="mt-1 text-xs text-muted-foreground">Revenue and completed transactions over {days} days</p></div>
          <TrendingUp className="h-4 w-4 text-[var(--dashboard-accent)]" />
        </div>
        <div className="flex h-[220px] items-center justify-center text-center">
          <div className="max-w-xs"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]"><TrendingUp className="h-4 w-4" /></span><p className="mt-3 text-sm font-semibold">No completed sales in this period</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Revenue and transaction trends will appear after the first completed sale.</p></div>
        </div>
      </article>
    )
  }

  const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0)
  const totalTransactions = data.reduce((sum, row) => sum + row.transactions, 0)
  const activeDays = data.filter((row) => row.transactions > 0).length

  return (
    <article className="app-panel overflow-hidden">
      <div className="flex items-start justify-between border-b px-4 py-4 sm:px-5">
        <div><h2>Revenue trend</h2><p className="mt-1 text-xs text-muted-foreground">Revenue and completed transactions over {days} days</p></div>
        <span className="rounded-md bg-[var(--dashboard-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--dashboard-accent)]">Daily view</span>
      </div>
      <div className="grid border-b sm:grid-cols-3">
        <div className="px-4 py-3 sm:px-5"><p className="text-[10px] text-muted-foreground">Period revenue</p><p className="mt-1 text-sm font-semibold tabular-nums">{formatCurrency(totalRevenue, currency)}</p></div>
        <div className="border-t px-4 py-3 sm:border-l sm:border-t-0 sm:px-5"><p className="text-[10px] text-muted-foreground">Transactions</p><p className="mt-1 text-sm font-semibold tabular-nums">{totalTransactions.toLocaleString('en-KE')}</p></div>
        <div className="border-t px-4 py-3 sm:border-l sm:border-t-0 sm:px-5"><p className="text-[10px] text-muted-foreground">Active sales days</p><p className="mt-1 text-sm font-semibold tabular-nums">{activeDays} of {days}</p></div>
      </div>
      <div className="h-[235px] px-2 pb-3 pt-4 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={28} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} tickFormatter={dateLabel} dy={8} />
            <YAxis axisLine={false} tickLine={false} width={44} tickCount={4} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} tickFormatter={compact} />
            <Tooltip
              cursor={{ fill: 'var(--dashboard-accent-soft)' }}
              contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 8, boxShadow: '0 12px 28px rgb(0 0 0 / .16)', fontSize: 11 }}
              labelFormatter={(label) => dateLabel(String(label))}
              formatter={(value) => [formatCurrency(Number(value), currency), 'Revenue']}
            />
            <Bar dataKey="revenue" name="Revenue" fill="var(--dashboard-accent-cta)" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
