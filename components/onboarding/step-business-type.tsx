'use client'

import { ShoppingCart, UtensilsCrossed, Pill } from 'lucide-react'
import { BUSINESS_TYPES } from '@/lib/types'
import { OnboardingHeader } from './onboarding-header'
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
    <div className="space-y-8">
      <OnboardingHeader
        title="What type of business do you run?"
        description="We&apos;ll customize IMARA POS to match your specific workflow and needs"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
