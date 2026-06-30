'use client'

import { PremiumStepHeader } from './premium-step-header'
import { PremiumInput } from './premium-input'
import { Building2, Mail, Phone } from 'lucide-react'

interface StepBusinessDetailsProps {
  data: {
    businessName: string
    businessEmail: string
    phone: string
  }
  onChange: (data: any) => void
  stepNumber?: number
  totalSteps?: number
}

export function StepBusinessDetails({
  data,
  onChange,
  stepNumber = 3,
  totalSteps = 7,
}: StepBusinessDetailsProps) {
  const handleChange = (field: string, value: string) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  return (
    <div className="space-y-12">
      <PremiumStepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        title="Tell us about your business"
        description="We'll use this information to personalize your experience and set up defaults"
      />

      <div className="space-y-6">
        <PremiumInput
          label="Business name"
          icon={Building2}
          type="text"
          required
          placeholder="My Awesome Business"
          value={data.businessName}
          onChange={(e) => handleChange('businessName', e.target.value)}
          description="This will appear throughout your dashboard"
        />

        <PremiumInput
          label="Business email"
          icon={Mail}
          type="email"
          required
          placeholder="business@example.com"
          value={data.businessEmail}
          onChange={(e) => handleChange('businessEmail', e.target.value)}
          description="We'll use this for important notifications"
        />

        <PremiumInput
          label="Phone number"
          icon={Phone}
          type="tel"
          required
          placeholder="+254 712 345 678"
          value={data.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          description="Used for backup contact information"
        />
      </div>
    </div>
  )
}
