'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'
import { ONBOARDING_TOKENS } from '@/lib/onboarding/tokens'

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
          <label
            className="mb-1 block text-sm font-semibold text-zinc-800"
          >
            {label}
            {props.required && <span className="ml-0.5 text-[#e42527]">*</span>}
          </label>
        )}

        {description && (
          <p className="mb-1.5 text-xs text-zinc-500">
            {description}
          </p>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'h-12 w-full cursor-pointer appearance-none rounded-lg border border-zinc-300 bg-white px-4 pr-10 text-sm text-zinc-950 outline-none transition-colors duration-150',
              'focus:border-[#e42527] focus:ring-2 focus:ring-[#e42527]/15',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-400 focus:ring-red-100 focus:border-red-500',
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
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
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
