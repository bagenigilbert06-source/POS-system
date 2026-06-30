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
        'group relative w-full rounded-2xl p-8 text-left transition-all duration-200',
        'flex flex-col gap-6 min-h-[280px]',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background',
        selected
          ? 'bg-primary/8 shadow-lg shadow-primary/20 scale-[1.02]'
          : 'bg-card hover:shadow-md-soft hover:-translate-y-1'
      )}
    >
      {/* Selection indicator - subtle */}
      {selected && (
        <div className="absolute top-6 right-6 flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 shadow-md">
          <Check className="h-4 w-4 text-primary-foreground stroke-[3]" />
        </div>
      )}

      {/* Icon - larger and more prominent */}
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

      {/* Title and Description */}
      <div className="flex-1 space-y-2">
        <h3 className="text-xl font-bold text-foreground leading-tight">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {/* Examples - visual pills */}
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
    </button>
  )
}
