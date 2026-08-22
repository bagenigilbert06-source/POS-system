'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { BarChart3, Clock3 } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils/format'

type Period = 1 | 7 | 30
type HourlySale = { date: string; hour: number; revenue: number; transactions: number }
type HourPoint = { hour: number; revenue: number; transactions: number; activity: number; label: string }

interface BusiestHoursCardProps {
  currency: string
  reportDate: string
  sales: HourlySale[]
}

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 1, label: 'Today' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
]

function dateKeyDaysAgo(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function hourRange(hour: number) {
  const format = (value: number) => {
    const normalized = value % 24
    const suffix = normalized < 12 ? 'AM' : 'PM'
    const display = normalized % 12 || 12
    return `${display} ${suffix}`
  }
  return `${format(hour)}–${format(hour + 1)}`
}

function axisHour(hour: number) {
  if (hour === 0) return '12A'
  if (hour < 12) return `${hour}A`
  if (hour === 12) return '12P'
  return `${hour - 12}P`
}

function HourTooltip({ active, payload, currency }: { active?: boolean; payload?: ReadonlyArray<{ payload?: HourPoint }>; currency: string }) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="min-w-44 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] p-3 text-xs shadow-[0_14px_32px_rgba(0,0,0,.2)]">
      <p className="font-bold text-[var(--dashboard-text)]">{point.label}</p>
      <div className="mt-2.5 space-y-2">
        <div className="flex items-center justify-between gap-5">
          <span className="text-[var(--dashboard-muted)]">Revenue</span>
          <span className="font-bold tabular-nums text-[var(--dashboard-text)]">{formatCurrency(point.revenue, currency)}</span>
        </div>
        <div className="flex items-center justify-between gap-5">
          <span className="text-[var(--dashboard-muted)]">Transactions</span>
          <span className="font-bold tabular-nums text-[var(--dashboard-text)]">{formatNumber(point.transactions)}</span>
        </div>
      </div>
    </div>
  )
}

export function BusiestHoursCard({ currency, reportDate, sales }: BusiestHoursCardProps) {
  const [period, setPeriod] = useState<Period>(30)
  const [periodOpen, setPeriodOpen] = useState(false)

  const view = useMemo(() => {
    const firstDate = dateKeyDaysAgo(reportDate, period - 1)
    const periodSales = sales.filter((sale) => sale.date >= firstDate && sale.date <= reportDate)
    const points = Array.from({ length: 24 }, (_, hour): HourPoint => {
      const matching = periodSales.filter((sale) => sale.hour === hour)
      const revenue = matching.reduce((sum, sale) => sum + sale.revenue, 0)
      const transactions = matching.reduce((sum, sale) => sum + sale.transactions, 0)
      return { hour, revenue, transactions, activity: transactions / period, label: hourRange(hour) }
    })
    const active = points.filter((point) => point.transactions > 0)
    const peak = active.reduce<HourPoint | null>((best, point) => {
      if (!best || point.activity > best.activity || (point.activity === best.activity && point.revenue > best.revenue)) return point
      return best
    }, null)
    const quietest = active.reduce<HourPoint | null>((best, point) => {
      if (!best || point.activity < best.activity || (point.activity === best.activity && point.revenue < best.revenue)) return point
      return best
    }, null)
    return { points, peak, quietest, transactions: periodSales.reduce((sum, sale) => sum + sale.transactions, 0) }
  }, [period, reportDate, sales])

  return (
    <article className="flex h-full min-h-[430px] flex-col overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--dashboard-border)] px-5 py-3.5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[0.9rem] font-bold tracking-tight">Busiest hours</h2>
            <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">When customers are buying most</p>
          </div>
        </div>
        <div className="relative shrink-0">
          <button type="button" aria-haspopup="listbox" aria-expanded={periodOpen} aria-label="Busiest hours period" onClick={() => setPeriodOpen((open) => !open)} className="flex h-8 min-w-[88px] items-center justify-between gap-2 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-2 text-xs font-semibold text-[var(--dashboard-text)] outline-none transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-accent-soft)] focus:border-transparent focus:ring-0">
            {PERIOD_OPTIONS.find((option) => option.value === period)?.label}<span className="text-[var(--dashboard-muted)]">⌄</span>
          </button>
          {periodOpen && <div role="listbox" className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-full overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-1 shadow-lg">
            {PERIOD_OPTIONS.map((option) => <button key={option.value} type="button" role="option" aria-selected={period === option.value} onClick={() => { setPeriod(option.value); setPeriodOpen(false) }} className="block w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-[var(--dashboard-text)] outline-none hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus:bg-[var(--dashboard-accent-soft)] focus:text-[var(--dashboard-accent)]">{option.label}</button>)}
          </div>}
        </div>
      </div>

      {view.peak ? (
        <div className="flex flex-1 flex-col px-5 pb-4 pt-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--dashboard-muted)]">Peak time</p>
              <p className="mt-1 text-[1.35rem] font-bold leading-none tracking-tight">{view.peak.label}</p>
            </div>
            <div className="text-right">
              <p className="text-[0.82rem] font-bold tabular-nums">{formatCurrency(view.peak.revenue, currency)}</p>
              <p className="mt-1 text-xs text-[var(--dashboard-muted)]">{formatNumber(view.peak.transactions)} {view.peak.transactions === 1 ? 'transaction' : 'transactions'}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[var(--dashboard-text)]">Sales activity</p>
            <p className="text-[0.65rem] text-[var(--dashboard-muted)]">{period === 1 ? 'Transactions by hour' : 'Average transactions per day'}</p>
          </div>
          <div className="mt-2 h-[132px] w-full" role="img" aria-label={`Hourly sales activity. Peak time is ${view.peak.label}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view.points} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="24%">
                <XAxis dataKey="hour" axisLine={false} tickLine={false} interval={2} tickFormatter={axisHour} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 9 }} />
                <Tooltip cursor={{ fill: 'var(--dashboard-accent-soft)' }} content={<HourTooltip currency={currency} />} />
                <Bar dataKey="activity" radius={[4, 4, 2, 2]} minPointSize={view.transactions ? 0 : undefined}>
                  {view.points.map((point) => (
                    <Cell key={point.hour} fill={point.hour === view.peak?.hour ? 'var(--dashboard-accent)' : 'var(--dashboard-muted)'} fillOpacity={point.hour === view.peak?.hour ? 1 : 0.24} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <dl className="mt-auto grid grid-cols-2 divide-x divide-[var(--dashboard-border)] border-t border-[var(--dashboard-border)] pt-3.5">
            <div className="pr-4">
              <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[var(--dashboard-muted)]">Busiest</dt>
              <dd className="mt-1 text-[0.82rem] font-bold">{view.peak.label}</dd>
            </div>
            <div className="pl-4">
              <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-[var(--dashboard-muted)]">Quietest active</dt>
              <dd className="mt-1 text-[0.82rem] font-bold">{view.quietest?.label ?? '—'}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]"><BarChart3 className="h-5 w-5" /></span>
          <p className="mt-3 text-sm font-semibold">Not enough sales data yet</p>
          <p className="mt-1 max-w-[260px] text-xs leading-5 text-[var(--dashboard-muted)]">Busiest hours will appear as more sales are completed.</p>
        </div>
      )}
    </article>
  )
}
