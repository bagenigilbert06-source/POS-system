'use client'

import { useMemo, useState } from 'react'
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
  const [range, setRange] = useState<1 | 7 | 30>(30)
  const chartData = useMemo(() => data.slice(-range).map((point) => ({
    ...point,
    label: new Date(`${point.date}T12:00:00`).toLocaleDateString('en-KE', range === 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }),
  })), [data, range])
  const summary = chartData.map((point) => `${point.label}: sales ${compact(point.revenue, currency)}, expenses ${compact(point.expenses, currency)}`).join('; ')
  const hasData = chartData.some((point) => point.revenue > 0 || point.expenses > 0)

  return (
    <div className="relative h-[330px] w-full pt-12 sm:h-[370px]" role="img" aria-label={`Sales and expenses over the last ${range === 1 ? 'day' : `${range} days`}`}>
      <p className="sr-only">{summary || 'No operating activity recorded in this period.'}</p>
      <div className="absolute left-1 top-0 z-10 flex rounded-lg border border-[#27272a] dark:bg-[#1a1f2e] p-1" aria-label="Chart period">
        {([[1, 'Today'], [7, '7 days'], [30, '30 days']] as const).map(([value, text]) => <button key={value} type="button" onClick={() => setRange(value)} aria-pressed={range === value} className={range === value ? 'rounded-md dark:bg-[#111827] px-3 py-1.5 text-xs font-bold dark:text-[#fafafa] shadow-sm' : 'rounded-md px-3 py-1.5 text-xs font-semibold dark:text-[#a1a1aa] hover:dark:text-[#fafafa]'}>{text}</button>)}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 10, left: -8, bottom: 0 }} barCategoryGap={range === 30 ? '72%' : '58%'}>
          <defs><linearGradient id="pesabyRevenueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="2 4" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} interval={range === 30 ? 4 : 0} tick={{ fill: '#a1a1aa', fontSize: 11 }} dy={9} />
          <YAxis axisLine={false} tickLine={false} width={58} tick={{ fill: '#a1a1aa', fontSize: 10 }} tickFormatter={(value) => compact(value, currency)} />
          <Tooltip cursor={{ fill: '#1a1f2e' }} contentStyle={{ background: '#1a1f2e', color: '#fafafa', border: '1px solid #27272a', borderRadius: 8, boxShadow: '0 12px 30px rgba(0, 0, 0, 0.3)', fontSize: 12 }} formatter={(value, name) => [compact(Number(value), currency), name === 'revenue' ? 'Sales' : 'Expenses']} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''} />
          <Bar dataKey="expenses" fill="#ffd60a" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Area type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={2.5} fill="url(#pesabyRevenueArea)" dot={false} activeDot={{ r: 4, fill: '#ef4444', stroke: '#111827', strokeWidth: 2 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      {!hasData && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="rounded-lg border border-[#27272a] dark:bg-[#111827]/95 px-4 py-3 text-center shadow-sm"><p className="text-sm font-semibold dark:text-[#fafafa]">No activity this week</p><p className="mt-1 text-xs dark:text-[#a1a1aa]">The chart updates after sales or expenses are recorded.</p></div></div>}
    </div>
  )
}
