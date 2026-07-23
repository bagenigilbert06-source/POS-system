'use client'

import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Users,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SalesMetric {
  label: string
  value: string | number
  trend?: number
  prefix?: string
  suffix?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface SalesAnalyticsCardProps {
  title: string
  metrics: SalesMetric[]
  period?: string
}

export function SalesAnalyticsCard({
  title,
  metrics,
  period = 'Today',
}: SalesAnalyticsCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{period}</p>
      </div>

      <div className="grid gap-3">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon
          const hasTrend = metric.trend !== undefined
          const isTrendUp = hasTrend && (metric.trend ?? 0) > 0
          const TrendIcon = isTrendUp ? TrendingUp : TrendingDown

          return (
            <div
              key={idx}
              className="flex items-start justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div className={cn('mt-1 p-1.5 rounded', metric.color)}>
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="text-sm font-bold mt-0.5 truncate">
                    {metric.prefix}
                    {metric.value}
                    {metric.suffix}
                  </p>
                </div>
              </div>

              {hasTrend && metric.trend !== undefined && (
                <div className={cn(
                  'flex items-center gap-0.5 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap',
                  isTrendUp
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                )}>
                  <TrendIcon className="h-3 w-3" />
                  {Math.abs(metric.trend as number)}%
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SalesComparisonProps {
  current: number
  previous: number
  label: string
  formatFn?: (n: number) => string
}

export function SalesComparison({
  current,
  previous,
  label,
  formatFn = undefined,
}: SalesComparisonProps) {
  const format = formatFn || ((n: number) => formatCurrency(n))
  const change = previous === 0 ? 100 : ((current - previous) / previous) * 100
  const isPositive = change >= 0

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold">{format(current)}</p>
        <div className={cn(
          'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded',
          isPositive
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-red-100 text-red-700'
        )}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">vs {format(previous)} previously</p>
    </div>
  )
}
