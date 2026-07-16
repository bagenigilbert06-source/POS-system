'use client'

import { Users } from 'lucide-react'
import { PremiumStepHeader } from './premium-step-header'
import { PremiumSelectionCard } from './premium-selection-card'

const BUSINESS_SIZES = [
  {
    id: 'solo',
    label: 'Solo',
    description: 'Just me — a single-person operation',
  },
  {
    id: 'small',
    label: 'Small',
    description: '2–10 employees — a growing team',
  },
  {
    id: 'medium',
    label: 'Medium',
    description: '11–50 employees — an established business',
  },
  {
    id: 'large',
    label: 'Large',
    description: '50+ employees — a larger operation',
  },
]

interface StepBusinessSizeProps {
  value: string
  onChange: (value: string) => void
  stepNumber?: number
  totalSteps?: number
}

export function StepBusinessSize({
  value,
  onChange,
  stepNumber = 5,
  totalSteps = 7,
}: StepBusinessSizeProps) {
  return (
    <div className="space-y-8">
      <PremiumStepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        title="How many people work in your business?"
        description="We’ll tailor workspace settings to the size of your team."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {BUSINESS_SIZES.map((size) => (
          <PremiumSelectionCard
            key={size.id}
            icon={Users}
            title={size.label}
            description={size.description}
            selected={value === size.id}
            onClick={() => onChange(size.id)}
          />
        ))}
      </div>
    </div>
  )
}
