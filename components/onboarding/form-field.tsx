'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  description?: string
  error?: string
  children: ReactNode
  required?: boolean
}

export function FormField({ label, description, error, children, required }: FormFieldProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-semibold text-foreground">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      <div className="relative">
        {children}
        {error && (
          <p className="mt-1.5 text-xs font-medium text-red-500 animate-fade-up">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
