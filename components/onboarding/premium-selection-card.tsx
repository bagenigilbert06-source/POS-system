'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'
import { ONBOARDING_TOKENS, ONBOARDING_PRESETS } from '@/lib/onboarding/tokens'

interface PremiumSelectionCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  examples?: string[]
  selected: boolean
  onClick: () => void
  badge?: string
}

/**
 * Premium selection card for business type, category, etc.
 * Features:
 * - Larger icon (64px) with better proportions
 * - Smooth hover and selection animations
 * - Elegant selected state with shadow elevation
 * - No borders, uses whitespace and shadows for depth
 * - Minimum 280px height for comfortable interaction
 */
export function PremiumSelectionCard({
  icon: Icon,
  title,
  description,
  examples = [],
  selected,
  onClick,
  badge,
}: PremiumSelectionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-xl p-5 text-left transition-all duration-200 flex flex-col gap-6 min-h-[160px]',
        selected
          ? 'bg-primary/8 shadow-md scale-[1.02]'
          : 'bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5'
      )}
      aria-pressed={selected}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-6 right-6 flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 shadow-md">
          <Check className="h-4 w-4 text-primary-foreground stroke-[3]" />
        </div>
      )}

      {/* Icon */}
      <div className="flex items-start">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0',
            selected
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/10 text-primary group-hover:bg-primary/15'
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn(
            ONBOARDING_TOKENS.typography.cardTitle,
            ONBOARDING_TOKENS.typography.cardTitleColor
          )}>
            {title}
          </h3>
          {badge && (
            <span className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-lg bg-accent/20 text-accent-foreground">
              {badge}
            </span>
          )}
        </div>
        <p className={cn(
          ONBOARDING_TOKENS.typography.cardDescription,
          'line-clamp-2'
        )}>
          {description}
        </p>
      </div>


    </button>
  )
}
