'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import React from 'react'

interface BusinessTypeCardProps {
  icon: React.ComponentType<any>
  title: string
  description: string
  examples: string[]
  selected: boolean
  onClick: () => void
}

export function BusinessTypeCard({
  icon: Icon,
  title,
  description,
  examples,
  selected,
  onClick,
}: BusinessTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full rounded-xl border-2 p-6 text-left transition-all duration-300',
        'flex flex-col gap-4',
        selected
          ? 'border-primary bg-primary/5 shadow-md-soft'
          : 'border-border bg-card hover:border-primary/30 hover:shadow-md-soft hover:-translate-y-1'
      )}
    >
      {/* Checkmark indicator */}
      {selected && (
        <div className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <Check className="h-4 w-4 text-primary-foreground" />
        </div>
      )}

      {/* Icon */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg transition-all duration-300',
            selected
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/10 text-primary group-hover:bg-primary/20'
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Title and Description */}
      <div className="flex-1 space-y-1">
        <h3 className="text-lg font-semibold text-foreground leading-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {/* Examples */}
      <div className="flex flex-wrap gap-2">
        {examples.slice(0, 2).map((example) => (
          <span
            key={example}
            className="inline-block rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-all duration-300 group-hover:bg-primary/10"
          >
            {example}
          </span>
        ))}
        {examples.length > 2 && (
          <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-all duration-300 group-hover:bg-primary/10">
            +{examples.length - 2} more
          </span>
        )}
      </div>
    </button>
  )
}
