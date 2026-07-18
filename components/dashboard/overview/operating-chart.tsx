'use client'

import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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
  const chartData = data.map((point) => ({ ...point, label: new Date(`${point.date}T12:00:00`).toLocaleDateString('en-KE', { weekday: 'short' }) }))
  const summary = chartData.map((point) => `${point.label}: sales ${compact(point.revenue, currency)}, expenses ${compact(point.expenses, currency)}`).join('; ')
  const hasData = chartData.some((point) => point.revenue > 0 || point.expenses > 0)

  return (
    <div className="relative h-[280px] w-full sm:h-[320px]" role="img" aria-label="Sales and expenses over the last seven days">
      <p className="sr-only">{summary || 'No operating activity recorded in this period.'}</p>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 10, left: -8, bottom: 0 }} barCategoryGap="58%">
          <defs><linearGradient id="pesabyRevenueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--dashboard-chart-revenue-fill)" stopOpacity={0.18} /><stop offset="100%" stopColor="var(--dashboard-chart-revenue-fill)" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="2 4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }} dy={9} />
          <YAxis axisLine={false} tickLine={false} width={58} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} tickFormatter={(value) => compact(value, currency)} />
          <Tooltip cursor={{ fill: 'var(--dashboard-surface-subtle)' }} contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 8, boxShadow: '0 12px 30px rgb(38 28 17 / .16)', fontSize: 12 }} formatter={(value, name) => [compact(Number(value), currency), name === 'revenue' ? 'Sales' : 'Expenses']} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''} />
          <Bar dataKey="expenses" fill="var(--dashboard-chart-secondary)" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Area type="monotone" dataKey="revenue" stroke="var(--dashboard-chart-revenue)" strokeWidth={2.5} fill="url(#pesabyRevenueArea)" dot={false} activeDot={{ r: 4, fill: 'var(--dashboard-chart-revenue)', stroke: 'var(--dashboard-surface)', strokeWidth: 2 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      {!hasData && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="rounded-lg border border-[#e5e8ed] bg-white/95 px-4 py-3 text-center shadow-sm"><p className="text-sm font-semibold text-[#344054]">No activity this week</p><p className="mt-1 text-xs text-[#8a94a5]">The chart updates after sales or expenses are recorded.</p></div></div>}
    </div>
  )
}
