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
    <div className="space-y-8">
      <PremiumStepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        title="Tell us about your business"
        description="We’ll use these details to prepare the right workspace defaults."
      />

      <div className="space-y-6">
        <PremiumInput
          label="Business name"
          icon={Building2}
          type="text"
          required
          placeholder="Your business name"
          value={data.businessName}
          onChange={(e) => handleChange('businessName', e.target.value)}
          description="This name will appear throughout your workspace."
        />

        <PremiumInput
          label="Business email"
          icon={Mail}
          type="email"
          required
          placeholder="you@business.com"
          value={data.businessEmail}
          onChange={(e) => handleChange('businessEmail', e.target.value)}
          description="Used for important workspace notifications."
        />

        <PremiumInput
          label="Phone number"
          icon={Phone}
          type="tel"
          required
          placeholder="+254 712 345 678"
          value={data.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          description="Used as your business contact number."
        />
      </div>
    </div>
  )
}
