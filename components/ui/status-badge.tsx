import { cn } from '@/lib/utils'

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'default'

interface StatusBadgeProps {
  variant?: StatusVariant
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses: Record<StatusVariant, string> = {
  success: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-300',
  warning: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-300',
  danger: 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/35 dark:text-red-300',
  info: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/35 dark:text-blue-300',
  default: 'border border-border bg-muted text-muted-foreground',
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-2 py-0.5 text-[11px] font-semibold rounded-full',
  md: 'px-2.5 py-1 text-xs font-semibold rounded-full',
  lg: 'px-3 py-1.5 text-sm font-semibold rounded-full',
}

export function StatusBadge({ variant = 'default', children, className, size = 'md' }: StatusBadgeProps) {
  return <span className={cn('inline-flex items-center', variantClasses[variant], sizeClasses[size], className)}>{children}</span>
}
