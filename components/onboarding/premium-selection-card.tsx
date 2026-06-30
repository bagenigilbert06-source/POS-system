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
  recommended?: boolean
}

export function PremiumSelectionCard({
  icon: Icon,
  title,
  description,
  examples = [],
  selected,
  onClick,
  badge,
  recommended = false,
}: PremiumSelectionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl p-6 text-left transition-all duration-150 relative',
        'flex flex-col gap-4 min-h-[260px]',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background',
        selected
          ? 'bg-primary/8 border-2 border-primary shadow-sm'
          : 'bg-card border-2 border-border hover:border-primary/40'
      )}
      aria-pressed={selected}
    >
      {/* Recommended Badge */}
      {recommended && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Recommended
          </span>
        </div>
      )}

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-4 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[3]" />
        </div>
      )}

      {/* Icon - Clean and proportional */}
      <div className={cn(
        'flex h-12 w-12 items-center justify-center rounded-lg transition-colors duration-150',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'bg-primary/10 text-primary'
      )}>
        <Icon className="h-6 w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 pt-2">
        <h3 className="font-semibold text-foreground text-base leading-snug">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>

      {/* Example pills - clean and minimal */}
      {examples.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {examples.slice(0, 2).map((example) => (
            <span
              key={example}
              className={cn(
                'inline-block rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150',
                selected
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {example}
            </span>
          ))}
          {examples.length > 2 && (
            <span
              className={cn(
                'inline-block rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150',
                selected
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground'
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
