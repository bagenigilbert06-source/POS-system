'use client'

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, ReferenceLine } from 'recharts'
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
            <div><h2 className="font-bold">30-day forecast</h2><p className="mt-1 text-sm text-muted-foreground">Revenue predictions for next 30 days</p></div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="flex h-[280px] items-center justify-center text-center">
          <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm font-semibold">Insufficient data</p>
            <p className="text-xs text-muted-foreground mt-1">Forecasts available after 30+ days of data</p>
          </div>
        </div>
      </article>
    )
  }

  const lastDateWithActual = historical.findIndex((d) => !d.actual)
  const confidenceColor: Record<string, string> = {
    high: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    low: 'text-red-600 dark:text-red-400',
  }

  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-bold">30-day forecast</h2><p className="mt-1 text-sm text-muted-foreground">Revenue predictions for next 30 days</p></div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="space-y-4 p-4 sm:p-5 border-b">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Avg forecast (30d)</p>
            <p className="font-bold text-sm mt-1">{formatCurrency(
              historical.slice(lastDateWithActual).reduce((sum, d) => sum + d.forecast, 0) / Math.max(1, historical.slice(lastDateWithActual).length),
              currency
            )}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Total projected</p>
            <p className="font-bold text-sm mt-1">{formatCurrency(
              historical.slice(lastDateWithActual).reduce((sum, d) => sum + d.forecast, 0),
              currency
            )}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className={`font-bold text-sm mt-1 ${confidenceColor[historical[lastDateWithActual]?.confidence || 'medium']}`}>
              {(historical[lastDateWithActual]?.confidence || 'medium').charAt(0).toUpperCase() + (historical[lastDateWithActual]?.confidence || 'medium').slice(1)}
            </p>
          </div>
        </div>
      </div>
      <div className="h-[280px] px-2 pb-3 pt-5 sm:h-[320px] sm:px-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historical} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--dashboard-chart-grid)" strokeDasharray="3 5" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }} tickFormatter={compact} />
            <Tooltip 
              cursor={{ fill: 'var(--dashboard-surface-subtle)' }} 
              contentStyle={{ background: 'var(--dashboard-chart-tooltip)', color: 'var(--dashboard-text)', border: '1px solid var(--dashboard-border)', borderRadius: 10, boxShadow: '0 12px 28px rgb(0 0 0 / .18)', fontSize: 12 }}
              formatter={(value, name) => {
                if (!value) return null
                return [formatCurrency(Number(value), currency), name === 'actual' ? 'Actual' : 'Forecast']
              }}
            />
            {lastDateWithActual > 0 && <ReferenceLine x={historical[lastDateWithActual - 1]?.date} stroke="var(--dashboard-chart-grid)" strokeDasharray="5 5" label={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }} />}
            <Legend />
            {historical.some((d) => d.actual) && (
              <Line type="monotone" dataKey="actual" stroke="var(--dashboard-chart-revenue)" strokeWidth={2.5} dot={false} isAnimationActive={false} name="Actual" />
            )}
            <Line type="monotone" dataKey="forecast" stroke="var(--dashboard-chart-secondary)" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} name="Forecast" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
