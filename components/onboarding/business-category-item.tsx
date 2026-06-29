'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessCategoryItemProps {
  id: string
  name: string
  selected: boolean
  onClick: () => void
}

export function BusinessCategoryItem({
  id,
  name,
  selected,
  onClick,
}: BusinessCategoryItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border-2 p-4 text-left transition-all duration-200',
        selected
          ? 'border-primary bg-primary/5 shadow-md-soft'
          : 'border-border hover:border-primary/30 hover:bg-muted/50'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className={cn(
            'text-sm font-semibold transition-colors duration-200',
            selected ? 'text-foreground' : 'text-foreground'
          )}
        >
          {name}
        </h3>
        <div
          className={cn(
            'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
            selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
          )}
        >
          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      </div>
    </button>
  )
}
