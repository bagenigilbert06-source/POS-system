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
        ONBOARDING_PRESETS.selectionCard,
        selected
          ? `bg-primary/8 ${ONBOARDING_TOKENS.elevation.large} shadow-primary/20 scale-[1.02]`
          : `bg-card ${ONBOARDING_TOKENS.elevation.small} ${ONBOARDING_TOKENS.states.hover.shadow} ${ONBOARDING_TOKENS.states.hover.translate}`
      )}
      aria-pressed={selected}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-6 right-6 flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 shadow-md">
          <Check className="h-4 w-4 text-primary-foreground stroke-[3]" />
        </div>
      )}

      {/* Icon - Large and prominent */}
      <div className="flex items-start">
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0',
            selected
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-primary/12 text-primary group-hover:bg-primary/18'
          )}
        >
          <Icon className="h-8 w-8" />
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

      {/* Example pills */}
      {examples.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {examples.slice(0, 2).map((example) => (
            <span
              key={example}
              className={cn(
                'inline-block rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                selected
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
              )}
            >
              {example}
            </span>
          ))}
          {examples.length > 2 && (
            <span
              className={cn(
                'inline-block rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                selected
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
              )}
            >
              +{examples.length - 2}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
