'use client'

import { ShoppingCart, UtensilsCrossed, Pill } from 'lucide-react'
import { BUSINESS_TYPES, BusinessTypeEnum } from '@/lib/types'
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

// Most popular business types get the "Recommended" badge
const recommendedTypes = new Set([
  BusinessTypeEnum.RETAIL,
  BusinessTypeEnum.RESTAURANT,
])

export function StepBusinessType({
  value,
  onChange,
  stepNumber = 1,
  totalSteps = 7,
}: StepBusinessTypeProps) {
  return (
    <div className="space-y-10">
      {/* Premium step header */}
      <PremiumStepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        title="How will you use IMARA?"
        description="Choose your business model to unlock tailored features and workflows designed for your success."
      />

      {/* Selection cards - clean grid with better spacing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
              recommended={recommendedTypes.has(type.id as BusinessTypeEnum)}
            />
          )
        })}
      </div>
    </div>
  )
}
