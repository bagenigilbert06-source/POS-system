'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'
import { ONBOARDING_TOKENS, ONBOARDING_PRESETS } from '@/lib/onboarding/tokens'

interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  icon?: LucideIcon
  description?: string
}

/**
 * Premium form input with:
 * - 48px height (comfortable touch target)
 * - Better padding and spacing
 * - Optional icon support
 * - Validation states
 * - Helper text and descriptions
 */
export const PremiumInput = React.forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ label, helperText, error, icon: Icon, description, className, ...props }, ref) => {
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
          {Icon && (
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          )}
          <input
            ref={ref}
            className={cn(
              'w-full h-11 px-4 rounded-lg text-[14px] text-gray-900 placeholder:text-gray-400 transition-all duration-150 outline-none',
              'bg-white border border-gray-200',
              'focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              Icon && 'pl-11',
              error && 'border-red-400 focus:ring-red-100 focus:border-red-500',
              className
            )}
            {...props}
          />
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

PremiumInput.displayName = 'PremiumInput'
