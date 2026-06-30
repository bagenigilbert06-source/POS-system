'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'

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
 * Clean Zoho/Odoo-style selection card.
 * Subtle border, primary highlight on select, no heavy shadows.
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
        'group relative w-full rounded-xl p-5 text-left transition-all duration-150 flex flex-col gap-4 min-h-[150px]',
        selected
          ? 'bg-primary/5 border-2 border-primary ring-0'
          : 'bg-card border border-border hover:border-primary/40 hover:bg-primary/[0.02]',
      )}
      aria-pressed={selected}
    >
      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[2.5]" />
        </div>
      )}

      {/* Icon */}
      <div
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-150',
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            'text-sm font-semibold leading-tight',
            selected ? 'text-primary' : 'text-foreground',
          )}>
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>
    </button>
  )
}
