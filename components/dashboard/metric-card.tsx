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
    default: 'bg-primary/10 text-primary',
    success: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]',
    danger: 'bg-destructive/10 text-destructive',
  }

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.value >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'
                )}
              >
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0', iconColors[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
