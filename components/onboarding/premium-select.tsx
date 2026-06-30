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
          <label
            className="block text-[13px] font-semibold mb-1"
            style={{ color: '#374151' }}
          >
            {label}
            {props.required && <span className="ml-0.5" style={{ color: '#dc2626' }}>*</span>}
          </label>
        )}

        {description && (
          <p className="text-[12px] mb-1.5" style={{ color: '#94a3b8' }}>
            {description}
          </p>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full h-11 px-4 pr-10 rounded-lg text-[14px] text-gray-900 appearance-none cursor-pointer transition-all duration-150 outline-none',
              'bg-white border border-gray-200',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
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
