'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'
import { ONBOARDING_TOKENS } from '@/lib/onboarding/tokens'

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
          {Icon && (
            <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          )}
          <input
            ref={ref}
            className={cn(
              'h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none transition-colors duration-150 placeholder:text-zinc-400',
              'focus:border-[#e42527] focus:ring-2 focus:ring-[#e42527]/15',
              Icon && 'pl-11',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-100',
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
