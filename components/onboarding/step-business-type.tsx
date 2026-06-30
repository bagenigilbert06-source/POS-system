'use client'

import { ShoppingCart, UtensilsCrossed, Pill } from 'lucide-react'
import { BUSINESS_TYPES } from '@/lib/types'
import { PremiumStepHeader } from './premium-step-header'
import { PremiumSelectionCard } from './premium-selection-card'

interface StepBusinessTypeProps {
  value: string
  onChange: (value: string) => void
  stepNumber?: number
  totalSteps?: number
}

const iconMap: Record<string, React.ComponentType<any>> = {
  ShoppingCart,
  UtensilsCrossed,
  Pill,
}

export function StepBusinessType({
  value,
  onChange,
  stepNumber = 1,
  totalSteps = 7,
}: StepBusinessTypeProps) {
  return (
    <div className="space-y-12">
      {/* Premium step header */}
      <PremiumStepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        title="How will you use IMARA?"
        description="Choose your business model to unlock tailored features and workflows designed for your success."
      />

      {/* Selection cards with improved spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {BUSINESS_TYPES.map((type) => {
          const Icon = iconMap[type.icon] || ShoppingCart
          const examples = type.examples || []

          return (
            <PremiumSelectionCard
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
