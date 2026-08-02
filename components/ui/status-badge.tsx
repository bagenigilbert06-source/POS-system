import { cn } from '@/lib/utils'

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'default'

interface StatusBadgeProps {
  variant?: StatusVariant
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses: Record<StatusVariant, string> = {
  success: 'bg-[#22c55e]/12 text-[#22c55e] dark:bg-[#22c55e]/15 dark:text-[#22c55e] border border-[#22c55e]/20',
  warning: 'bg-[#f59e0b]/12 text-[#f59e0b] dark:bg-[#f59e0b]/15 dark:text-[#f59e0b] border border-[#f59e0b]/20',
  danger: 'bg-[#ef4444]/12 text-[#ef4444] dark:bg-[#ef4444]/15 dark:text-[#ef4444] border border-[#ef4444]/20',
  info: 'bg-blue-500/12 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20',
  default: 'bg-gray-500/12 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300 border border-gray-500/20',
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-2 py-1 text-xs font-medium rounded',
  md: 'px-3 py-1.5 text-sm font-medium rounded-md',
  lg: 'px-4 py-2 text-base font-medium rounded-lg',
}

export function StatusBadge({ variant = 'default', children, className, size = 'md' }: StatusBadgeProps) {
  return <span className={cn('inline-flex items-center', variantClasses[variant], sizeClasses[size], className)}>{children}</span>
}
