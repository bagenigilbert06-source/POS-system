'use client'

import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OnboardingHeader } from './onboarding-header'

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
    <div className="space-y-8">
      <OnboardingHeader
        title="How many people work in your business?"
        description="This helps us recommend features and settings for your team size"
        centered={true}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUSINESS_SIZES.map((size) => (
          <button
            key={size.id}
            onClick={() => onChange(size.id)}
            className={cn(
              'group p-5 rounded-lg border-2 transition-all duration-300 text-left',
              'flex items-start gap-3',
              value === size.id
                ? 'border-primary bg-primary/5 shadow-md-soft'
                : 'border-border hover:border-primary/30 hover:shadow-md-soft hover:-translate-y-1'
            )}
          >
            <div
              className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300',
                value === size.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'
              )}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{size.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{size.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
