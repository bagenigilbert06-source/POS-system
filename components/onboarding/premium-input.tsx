'use client'

import { cn } from '@/lib/utils'
import { InputHTMLAttributes } from 'react'

interface PremiumInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

export function PremiumInput({ icon, className, ...props }: PremiumInputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {icon}
        </div>
      )}
      <input
        {...props}
        className={cn(
          'w-full rounded-lg border border-border bg-card px-4 py-3 text-sm outline-none transition-all duration-200',
          'placeholder:text-muted-foreground/60',
          'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:shadow-md focus:shadow-primary/10',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          icon && 'pl-10',
          className
        )}
      />
    </div>
  )
}
