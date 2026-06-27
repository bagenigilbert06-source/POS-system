'use client'

import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const BUSINESS_SIZES = [
  {
    id: 'solo',
    label: 'Solo',
    description: 'Just me',
  },
  {
    id: 'small',
    label: 'Small',
    description: '2-10 employees',
  },
  {
    id: 'medium',
    label: 'Medium',
    description: '11-50 employees',
  },
  {
    id: 'large',
    label: 'Large',
    description: '50+ employees',
  },
]

interface StepBusinessSizeProps {
  value: string
  onChange: (value: string) => void
}

export function StepBusinessSize({ value, onChange }: StepBusinessSizeProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">How many people work in your business?</h2>
        <p className="text-muted-foreground">This helps us recommend features you might need</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BUSINESS_SIZES.map((size) => (
          <button
            key={size.id}
            onClick={() => onChange(size.id)}
            className={cn(
              'p-4 rounded-lg border-2 transition-all duration-200 text-left',
              'hover:border-primary/50 hover:bg-primary/5',
              value === size.id
                ? 'border-primary bg-primary/10'
                : 'border-border'
            )}
          >
            <div className="flex items-start gap-3">
              <Users className={cn(
                'h-5 w-5 mt-0.5 flex-shrink-0 transition-colors',
                value === size.id ? 'text-primary' : 'text-muted-foreground'
              )} />
              <div>
                <h3 className="font-semibold text-foreground text-sm">{size.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{size.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
