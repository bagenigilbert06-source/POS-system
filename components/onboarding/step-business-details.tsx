'use client'

import { cn } from '@/lib/utils'
import { OnboardingHeader } from './onboarding-header'

interface StepBusinessDetailsProps {
  data: {
    businessName: string
    businessEmail: string
    phone: string
  }
  onChange: (data: any) => void
}

export function StepBusinessDetails({ data, onChange }: StepBusinessDetailsProps) {
  const handleChange = (field: string, value: string) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  return (
    <div className="space-y-8">
      <OnboardingHeader
        title="Tell us about your business"
        description="We&apos;ll use this information to personalize your experience and set up defaults"
        centered={true}
      />

      <div className="space-y-5">
        <div>
          <label htmlFor="businessName" className="block text-sm font-semibold text-foreground mb-2">
            Business name
          </label>
          <input
            id="businessName"
            type="text"
            required
            placeholder="My Awesome Business"
            value={data.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-card px-4 py-3 text-sm outline-none',
              'placeholder:text-muted-foreground/70',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150 shadow-sm-soft'
            )}
          />
        </div>

        <div>
          <label htmlFor="businessEmail" className="block text-sm font-semibold text-foreground mb-2">
            Business email
          </label>
          <input
            id="businessEmail"
            type="email"
            placeholder="business@example.com"
            value={data.businessEmail}
            onChange={(e) => handleChange('businessEmail', e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-card px-4 py-3 text-sm outline-none',
              'placeholder:text-muted-foreground/70',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150 shadow-sm-soft'
            )}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-2">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="+254 712 345 678"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-card px-4 py-3 text-sm outline-none',
              'placeholder:text-muted-foreground/70',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150 shadow-sm-soft'
            )}
          />
        </div>
      </div>
    </div>
  )
}
