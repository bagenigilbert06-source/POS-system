'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface OperatingChartProps {
  data: Array<{ date: string; revenue: number; expenses: number }>
  currency: string
}

function compact(value: number, currency: string) {
  const symbols: Record<string, string> = {
    KES: 'Ksh',
    USD: '$',
    EUR: '€',
    GBP: '£',
    UGX: 'USh',
    TZS: 'TSh',
    RWF: 'RF',
  }
  const absolute = Math.abs(value)
  const scale = absolute >= 1_000_000_000
    ? { divisor: 1_000_000_000, suffix: 'B' }
    : absolute >= 1_000_000
      ? { divisor: 1_000_000, suffix: 'M' }
      : absolute >= 1_000
        ? { divisor: 1_000, suffix: 'K' }
        : { divisor: 1, suffix: '' }
  const scaled = value / scale.divisor
  const amount = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1).replace(/\.0$/, '')

  // Avoid Intl compact-currency formatting here. Its output differs between
  // Node's and browsers' ICU data, which makes the server HTML impossible to
  // hydrate reliably.
  return `${symbols[currency] ?? currency} ${amount}${scale.suffix}`
}

export function OperatingChart({ data, currency }: OperatingChartProps) {
  const [range, setRange] = useState<1 | 7 | 30>(30)
  const chartData = useMemo(() => data.slice(-range).map((point) => ({
    ...point,
    label: new Date(`${point.date}T12:00:00`).toLocaleDateString('en-KE', range === 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }),
  })), [data, range])
  const summary = chartData.map((point) => `${point.label}: sales ${compact(point.revenue, currency)}, expenses ${compact(point.expenses, currency)}`).join('; ')
  const hasData = chartData.some((point) => point.revenue > 0 || point.expenses > 0)
  const periodLabel = range === 1 ? 'today' : `the last ${range} days`

  return (
    <div className="relative h-[270px] w-full pt-10 sm:h-[305px]" role="img" aria-label={`Sales and expenses over the last ${range === 1 ? 'day' : `${range} days`}`}>
      <p className="sr-only">{summary || 'No operating activity recorded in this period.'}</p>
      <div className="absolute left-1 top-0 z-10 flex rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] p-1" aria-label="Chart period">
        {([[1, 'Today'], [7, '7 days'], [30, '30 days']] as const).map(([value, text]) => <button key={value} type="button" onClick={() => setRange(value)} aria-pressed={range === value} className={range === value ? 'rounded-md bg-[var(--dashboard-surface)] px-3 py-1.5 text-xs font-bold text-[var(--dashboard-text)] shadow-sm' : 'rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--dashboard-muted)] hover:text-[var(--dashboard-text)]'}>{text}</button>)}
      </div>
      {!hasData && <div className="flex h-full items-center justify-center"><div className="max-w-sm rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-5 py-4 text-center shadow-sm"><p className="text-sm font-semibold text-[var(--dashboard-text)]">No activity for {periodLabel}</p><p className="mt-1 text-xs leading-5 text-[var(--dashboard-muted)]">Sales and expenses will appear here after they are recorded.</p></div></div>}
      {hasData && (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 16, right: 12, left: -8, bottom: 0 }} barCategoryGap={range === 30 ? '54%' : '40%'}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} interval={range === 30 ? 4 : 0} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }} dy={9} />
              <YAxis axisLine={false} tickLine={false} width={58} tickCount={2} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} tickFormatter={(value) => compact(value, currency)} />
              <Tooltip cursor={{ fill: 'rgba(214, 168, 0, .08)' }} contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 10, boxShadow: '0 10px 24px rgba(16,24,40,.12)', fontSize: 12 }} itemStyle={{ color: 'var(--dashboard-text)' }} labelStyle={{ color: 'var(--dashboard-muted)', marginBottom: 4 }} formatter={(value, name) => [compact(Number(value), currency), name === 'revenue' ? 'Sales' : 'Expenses']} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''} />
              <Bar dataKey="revenue" name="Sales" fill="#d6a800" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
              <Bar dataKey="expenses" name="Expenses" fill="#344b70" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
