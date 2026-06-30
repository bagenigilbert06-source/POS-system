'use client'

import { ShoppingCart, UtensilsCrossed, Pill } from 'lucide-react'
import { BUSINESS_TYPES } from '@/lib/types'
import { BusinessTypeCard } from './business-type-card'

interface StepBusinessTypeProps {
  value: string
  onChange: (value: string) => void
}

const iconMap: Record<string, React.ComponentType<any>> = {
  ShoppingCart,
  UtensilsCrossed,
  Pill,
}

export function StepBusinessType({ value, onChange }: StepBusinessTypeProps) {
  return (
    <div className="space-y-10">
      {/* Minimal header with step indicator */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Step 1 of 6
        </p>
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            How will you use IMARA?
          </h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-lg">
            Choose your business model to unlock tailored features and workflows designed for your success.
          </p>
        </div>
      </div>

      {/* Selection cards with improved spacing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-12">
        {BUSINESS_TYPES.map((type) => {
          const Icon = iconMap[type.icon] || ShoppingCart
          const examples = type.examples || []

          return (
            <BusinessTypeCard
              key={type.id}
              icon={Icon}
              title={type.name}
              description={type.description}
              examples={examples}
              selected={value === type.id}
              onClick={() => onChange(type.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
