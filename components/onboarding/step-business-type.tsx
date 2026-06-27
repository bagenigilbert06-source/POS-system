'use client'

import { Briefcase, Store, UtensilsCrossed, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const BUSINESS_TYPES = [
  {
    id: 'retail',
    name: 'Retail Store',
    description: 'General retail products and merchandise',
    icon: Store,
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Cafe',
    description: 'Food service with kitchen orders',
    icon: UtensilsCrossed,
  },
  {
    id: 'hotel',
    name: 'Hotel & Accommodation',
    description: 'Room booking and guest management',
    icon: Building2,
  },
  {
    id: 'service',
    name: 'Service Business',
    description: 'Professional services',
    icon: Briefcase,
  },
]

interface StepBusinessTypeProps {
  value: string
  onChange: (value: string) => void
}

export function StepBusinessType({ value, onChange }: StepBusinessTypeProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">What type of business do you run?</h2>
        <p className="text-muted-foreground">This helps us customize Imara for your needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUSINESS_TYPES.map((type) => {
          const Icon = type.icon
          return (
            <button
              key={type.id}
              onClick={() => onChange(type.id)}
              className={cn(
                'p-4 rounded-lg border-2 transition-all duration-200 text-left',
                'hover:border-primary/50 hover:bg-primary/5',
                value === type.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border'
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn(
                  'h-6 w-6 mt-0.5 flex-shrink-0 transition-colors',
                  value === type.id ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{type.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
