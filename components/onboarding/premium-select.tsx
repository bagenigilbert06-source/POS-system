'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'
import { ONBOARDING_TOKENS, ONBOARDING_PRESETS } from '@/lib/onboarding/tokens'

interface PremiumSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
  description?: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
}

/**
 * Premium select component with:
 * - 48px height (comfortable touch target)
 * - Better padding and spacing
 * - Smooth focus states
 * - Validation support
 */
export const PremiumSelect = React.forwardRef<HTMLSelectElement, PremiumSelectProps>(
  ({ label, helperText, error, description, options, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className={ONBOARDING_PRESETS.formLabel}>
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        {description && (
          <p className={ONBOARDING_TOKENS.typography.helperText}>
            {description}
          </p>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full h-12 px-4 py-3 pr-10 rounded-lg border border-border bg-background text-foreground text-sm appearance-none cursor-pointer transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-destructive focus:ring-destructive/30 focus:border-destructive',
              className
            )}
            {...props}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        </div>

        {error ? (
          <p className="text-xs text-destructive font-medium">{error}</p>
        ) : (
          helperText && (
            <p className={ONBOARDING_TOKENS.typography.helperText}>
              {helperText}
            </p>
          )
        )}
      </div>
    )
  }
)

PremiumSelect.displayName = 'PremiumSelect'
