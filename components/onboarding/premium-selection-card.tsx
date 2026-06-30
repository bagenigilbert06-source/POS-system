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
        'group relative w-full rounded-2xl p-6 text-left transition-all duration-300 flex flex-col gap-5 min-h-[180px] border',
        selected
          ? 'bg-primary/5 border-primary/30 shadow-lg shadow-primary/15 scale-[1.02]'
          : 'bg-card border-border shadow-sm hover:shadow-md-soft hover:-translate-y-1 hover:border-primary/20'
      )}
      aria-pressed={selected}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-5 right-5 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-md">
          <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[3]" />
        </div>
      )}

      {/* Icon */}
      <div className="flex items-start">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 flex-shrink-0',
            selected
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-primary/10 text-primary group-hover:bg-primary/15'
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground leading-snug">
            {title}
          </h3>
          {badge && (
            <span className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg bg-accent/20 text-accent-foreground whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {description}
        </p>
      </div>


    </button>
  )
}
