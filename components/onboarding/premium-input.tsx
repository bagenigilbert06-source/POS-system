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
          {Icon && (
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          )}
          <input
            ref={ref}
            className={cn(
              ONBOARDING_PRESETS.premiumInput,
              Icon && 'pl-11',
              'hover:border-primary/40',
              error && 'border-destructive focus:ring-destructive/30 focus:border-destructive',
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
