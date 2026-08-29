import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function FilterPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.025)]', className)} {...props}/>
}

export function FilterFields({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-end gap-3', className)} {...props}/>
}
