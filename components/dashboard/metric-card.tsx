import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: MetricCardProps) {
  const iconColors = {
    default: 'dark:bg-[#22c55e]/15 dark:text-[#22c55e] bg-green-100 text-green-700',
    success: 'dark:bg-[#22c55e]/15 dark:text-[#22c55e] bg-green-100 text-green-700',
    warning: 'dark:bg-[#f59e0b]/15 dark:text-[#f59e0b] bg-amber-100 text-amber-700',
    danger: 'dark:bg-[#ef4444]/15 dark:text-[#ef4444] bg-red-100 text-red-700',
  }

  return (
    <div className="metric-card rounded-lg border border-[#27272a] dark:bg-[#111827] dark:text-[#fafafa] p-5 sm:p-6 card-elevation-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#a1a1aa] dark:text-[#a1a1aa]">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight dark:text-[#fafafa]">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-[#a1a1aa] dark:text-[#a1a1aa]">{subtitle}</p>}
          {trend && (
            <div className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.value >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                )}
              >
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-[#a1a1aa] dark:text-[#a1a1aa]">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg flex-shrink-0', iconColors[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
