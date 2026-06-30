'use client'

import { cn } from '@/lib/utils'
import { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface PremiumSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
}

export function PremiumSelect({ options, className, ...props }: PremiumSelectProps) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          'w-full rounded-lg border border-border bg-card px-4 py-3 text-sm outline-none transition-all duration-200',
          'appearance-none cursor-pointer',
          'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md focus:shadow-primary/10',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'pr-10',
          className
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}
