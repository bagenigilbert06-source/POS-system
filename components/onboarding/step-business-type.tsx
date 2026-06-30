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

const iconMap: Record<BusinessTypeEnum, React.ComponentType<{ className?: string }>> = {
  [BusinessTypeEnum.RETAIL]: ShoppingCart,
  [BusinessTypeEnum.RESTAURANT]: UtensilsCrossed,
  [BusinessTypeEnum.PHARMACY]: Pill,
}

const recommendedTypes = new Set<BusinessTypeEnum>([
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
      <PremiumStepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        title="How will you use IMARA?"
        description="Choose your business model to unlock tailored features and workflows designed for your success."
      />

      <div className="grid gap-5 md:grid-cols-3 md:gap-6">
        {BUSINESS_TYPES.map(({ id, name, description, examples = [] }) => {
          const Icon = iconMap[id] ?? ShoppingCart

          return (
            <PremiumSelectionCard
              key={id}
              icon={Icon}
              title={name}
              description={description}
              examples={examples}
              selected={value === id}
              onClick={() => onChange(id)}
              recommended={recommendedTypes.has(id)}
            />
          )
        })}
      </div>
    </div>
  )
}
