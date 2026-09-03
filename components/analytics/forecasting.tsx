'use client'

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'
import { TrendingUp, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface ForecastData {
  date: string
  actual?: number
  forecast: number
  confidence: 'high' | 'medium' | 'low'
}

interface ForecastingProps {
  historical: ForecastData[]
  currency: string
}

function compact(value: number) {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (absolute >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return String(value)
}

export function Forecasting({ historical, currency }: ForecastingProps) {
  if (!historical.length) {
    return (
      <article className="app-panel overflow-hidden">
        <div className="border-b px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div><h2>Revenue forecast</h2><p className="mt-1 text-xs text-muted-foreground">Historical performance and 30-day projection</p></div>
            <TrendingUp className="h-4 w-4 text-[var(--dashboard-accent)]" />
          </div>
        </div>
        <div className="flex h-[220px] items-center justify-center text-center">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm font-semibold">Insufficient data</p>
            <p className="text-xs text-muted-foreground mt-1">Forecasts available after 30+ days of data</p>
          </div>
        </div>
      </article>
    )
  }

  // Keep the transition point in both series so the forecast starts at the
  // last observed value instead of dropping to zero for one frame.
  const lastDateWithActual = historical.findIndex((d) => d.actual === undefined)
  const future = historical.filter((d) => d.actual === undefined)
  const lastActualIndex = lastDateWithActual === -1 ? historical.length - 1 : lastDateWithActual - 1
  const chartData = historical.map((row, index) => ({
    ...row,
    forecast: index < lastActualIndex
      ? undefined
      : index === lastActualIndex
        ? row.actual
        : row.forecast,
  }))
  const confidenceColor: Record<string, string> = {
    high: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    low: 'text-red-600 dark:text-red-400',
  }

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2>Revenue forecast</h2><p className="mt-1 text-xs text-muted-foreground">Historical performance and 30-day projection</p></div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--dashboard-muted)]" />Actual</span><span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-3 bg-[var(--dashboard-accent-cta)]" />Forecast</span></div>
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5 border-b">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Avg forecast (30d)</p>
            <p className="font-bold text-sm mt-1">{formatCurrency(
              future.reduce((sum, d) => sum + d.forecast, 0) / Math.max(1, future.length),
              currency
            )}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Total projected</p>
            <p className="font-bold text-sm mt-1">{formatCurrency(
              future.reduce((sum, d) => sum + d.forecast, 0),
              currency
            )}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className={`font-bold text-sm mt-1 ${confidenceColor[future[0]?.confidence || 'medium']}`}>
              {(future[0]?.confidence || 'medium').charAt(0).toUpperCase() + (future[0]?.confidence || 'medium').slice(1)}
            </p>
          </div>
        </div>
      </div>
      <div className="h-[235px] px-2 pb-3 pt-4 sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="analyticsActualArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--dashboard-muted)" stopOpacity={0.14} /><stop offset="100%" stopColor="var(--dashboard-muted)" stopOpacity={0.01} /></linearGradient>
              <linearGradient id="analyticsForecastArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--dashboard-accent-cta)" stopOpacity={0.12} /><stop offset="100%" stopColor="var(--dashboard-accent-cta)" stopOpacity={0.01} /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={26} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} tickFormatter={(value) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'UTC' })} dy={8} />
            <YAxis axisLine={false} tickLine={false} tickCount={4} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 10 }} tickFormatter={compact} />
            <Tooltip 
              cursor={{ stroke: 'var(--dashboard-chart-grid)', strokeWidth: 1 }}
              contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 8, boxShadow: '0 12px 28px rgb(0 0 0 / .16)', fontSize: 11 }}
              formatter={(value, name) => {
                if (value === undefined || value === null) return null
                return [formatCurrency(Number(value), currency), name === 'actual' ? 'Actual' : 'Forecast']
              }}
            />
            {lastDateWithActual > 0 && <ReferenceLine x={historical[lastDateWithActual]?.date} stroke="var(--dashboard-chart-grid)" strokeDasharray="5 5" />}
            <Area type="linear" dataKey="actual" name="actual" stroke="var(--dashboard-muted)" strokeWidth={1.5} fill="url(#analyticsActualArea)" dot={false} connectNulls={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="forecast" name="forecast" stroke="none" fill="url(#analyticsForecastArea)" connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="forecast" name="forecast" stroke="var(--dashboard-accent-cta)" strokeWidth={2.25} dot={false} activeDot={{ r: 4, fill: 'var(--dashboard-accent-cta)', stroke: 'var(--dashboard-surface)', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
