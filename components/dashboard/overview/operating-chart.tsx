'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, BarChart3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'

interface OperatingChartProps {
  data: Array<{ date: string; revenue: number; expenses: number }>
  currency: string
}

type Range = 1 | 7 | 30
type ChartPoint = {
  date: string
  revenue: number
  expenses: number
  net: number
  label: string
  fullDate: string
}

const RANGES: Array<{ value: Range; label: string }> = [
  { value: 1, label: 'Today' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
]

function compact(value: number, currency: string) {
  const symbols: Record<string, string> = { KES: 'KES', USD: '$', EUR: '€', GBP: '£', UGX: 'USh', TZS: 'TSh', RWF: 'RF' }
  const absolute = Math.abs(value)
  const scale = absolute >= 1_000_000 ? { divisor: 1_000_000, suffix: 'M' } : absolute >= 1_000 ? { divisor: 1_000, suffix: 'K' } : { divisor: 1, suffix: '' }
  const scaled = value / scale.divisor
  const amount = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1).replace(/\.0$/, '')
  return `${symbols[currency] ?? currency} ${amount}${scale.suffix}`
}

function PerformanceTooltip({ active, payload, currency }: { active?: boolean; payload?: Array<{ payload: ChartPoint }>; currency: string }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="min-w-[190px] rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] p-3 text-xs shadow-xl">
      <p className="font-bold text-[var(--dashboard-text)]">{point.fullDate}</p>
      <div className="mt-2.5 space-y-2">
        <div className="flex items-center justify-between gap-6"><span className="text-[var(--dashboard-muted)]">Revenue</span><span className="font-semibold tabular-nums text-[var(--dashboard-text)]">{formatCurrency(point.revenue, currency)}</span></div>
        <div className="flex items-center justify-between gap-6"><span className="text-[var(--dashboard-muted)]">Expenses</span><span className="font-semibold tabular-nums text-[var(--dashboard-text)]">{formatCurrency(point.expenses, currency)}</span></div>
        <div className="border-t border-[var(--dashboard-border)] pt-2 flex items-center justify-between gap-6"><span className="text-[var(--dashboard-muted)]">Net</span><span className={`font-bold tabular-nums ${point.net >= 0 ? 'text-[var(--dashboard-success)]' : 'text-[var(--dashboard-danger)]'}`}>{formatCurrency(point.net, currency)}</span></div>
      </div>
    </div>
  )
}

export function OperatingChart({ data, currency }: OperatingChartProps) {
  const [range, setRange] = useState<Range>(30)
  const chartData = useMemo<ChartPoint[]>(() => data.slice(-range).map((point) => {
    const date = new Date(`${point.date}T12:00:00`)
    return {
      ...point,
      net: point.revenue - point.expenses,
      label: date.toLocaleDateString('en-KE', range === 7 ? { weekday: 'short', day: 'numeric' } : { day: 'numeric', month: 'short' }),
      fullDate: date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
    }
  }), [data, range])

  const revenue = chartData.reduce((sum, point) => sum + point.revenue, 0)
  const expenses = chartData.reduce((sum, point) => sum + point.expenses, 0)
  const net = revenue - expenses
  const hasData = chartData.some((point) => point.revenue > 0 || point.expenses > 0)
  const periodLabel = range === 1 ? 'today' : `the last ${range} days`

  return (
    <Card className="flex min-h-[430px] flex-col overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b border-[var(--dashboard-border)] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-bold tracking-tight">Revenue &amp; expenses</h2>
          <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">Sales, expenses and net performance over time.</p>
        </div>
        <Link href="/dashboard/reports" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--dashboard-muted)] transition-colors hover:text-[var(--dashboard-accent)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-soft-border)]">
          View report <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col px-5 pb-4 pt-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-3 divide-x divide-[var(--dashboard-border)]">
            <div className="pr-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-[var(--dashboard-muted)]">Revenue</p>
              <p className="mt-1.5 truncate text-lg font-bold tabular-nums">{compact(revenue, currency)}</p>
            </div>
            <div className="px-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-[var(--dashboard-muted)]">Expenses</p>
              <p className="mt-1.5 truncate text-lg font-bold tabular-nums">{compact(expenses, currency)}</p>
            </div>
            <div className="pl-3">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-[var(--dashboard-muted)]">Net profit</p>
              <p className={`mt-1.5 truncate text-lg font-bold tabular-nums ${net >= 0 ? 'text-[var(--dashboard-success)]' : 'text-[var(--dashboard-danger)]'}`}>{net < 0 ? '-' : ''}{compact(Math.abs(net), currency)}</p>
              <p className={`mt-0.5 text-[0.62rem] font-medium ${net >= 0 ? 'text-[var(--dashboard-success)]' : 'text-[var(--dashboard-danger)]'}`}>{net >= 0 ? 'Positive net' : 'Negative net'}</p>
            </div>
          </div>

          <div role="tablist" aria-label="Performance period" className="flex w-fit shrink-0 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] p-1">
            {RANGES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={range === option.value}
                onClick={() => setRange(option.value)}
                className={range === option.value
                  ? 'rounded-md bg-[var(--dashboard-surface)] px-3 py-1.5 text-xs font-bold text-[var(--dashboard-text)] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-soft-border)]'
                  : 'rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--dashboard-muted)] outline-none transition-colors hover:text-[var(--dashboard-text)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-soft-border)]'}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {hasData ? (
          <>
            <div className="mt-4 flex items-center gap-4 text-[0.68rem] font-semibold text-[var(--dashboard-muted)]">
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--dashboard-chart-revenue)]" />Revenue</span>
              {expenses > 0 && <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-3 rounded-full bg-[var(--dashboard-chart-secondary)]" />Expenses</span>}
            </div>
            <div className="mt-2 h-[235px] min-h-[235px] w-full" role="img" aria-label={`Revenue and expenses for ${periodLabel}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="operatingRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--dashboard-chart-revenue)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--dashboard-chart-revenue)" stopOpacity={0.015} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--dashboard-border)" strokeOpacity={0.55} strokeDasharray="3 5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={28} tick={{ fill: 'var(--dashboard-muted)', fontSize: 10 }} dy={9} />
                  <YAxis axisLine={false} tickLine={false} width={58} tickCount={4} tick={{ fill: 'var(--dashboard-muted)', fontSize: 10 }} tickFormatter={(value: number) => compact(value, currency)} />
                  <Tooltip cursor={{ stroke: 'var(--dashboard-muted)', strokeOpacity: 0.45, strokeDasharray: '4 4' }} content={<PerformanceTooltip currency={currency} />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--dashboard-chart-revenue)" strokeWidth={2.25} fill="url(#operatingRevenueFill)" activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--dashboard-surface)' }} dot={chartData.length <= 2 ? { r: 3, fill: 'var(--dashboard-chart-revenue)' } : false} isAnimationActive animationBegin={0} animationDuration={700} animationEasing="ease-in-out" />
                  {expenses > 0 && <Line type="monotone" dataKey="expenses" name="Expenses" stroke="var(--dashboard-chart-secondary)" strokeWidth={1.75} strokeDasharray="5 4" activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--dashboard-surface)' }} dot={chartData.length <= 2 ? { r: 3, fill: 'var(--dashboard-chart-secondary)' } : false} isAnimationActive animationBegin={0} animationDuration={700} animationEasing="ease-in-out" />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex min-h-[250px] flex-1 flex-col items-center justify-center text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]"><BarChart3 className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-semibold">No performance data yet</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--dashboard-muted)]">Sales and expenses will appear here as transactions are recorded.</p>
          </div>
        )}

        <div className="sr-only" aria-live="polite">For {periodLabel}: revenue {formatCurrency(revenue, currency)}, expenses {formatCurrency(expenses, currency)}, net {formatCurrency(net, currency)}.</div>
      </CardContent>
    </Card>
  )
}
