'use client'

import { OnboardingHeader } from './onboarding-header'
import { FormField } from './form-field'
import { PremiumInput } from './premium-input'
import { Building2, Mail, Phone } from 'lucide-react'

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

      <div className="space-y-6">
        <FormField label="Business name" required>
          <PremiumInput
            id="businessName"
            type="text"
            placeholder="My Awesome Business"
            value={data.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            icon={<Building2 className="h-4 w-4" />}
          />
        </FormField>

        <FormField label="Business email" required>
          <PremiumInput
            id="businessEmail"
            type="email"
            placeholder="business@example.com"
            value={data.businessEmail}
            onChange={(e) => handleChange('businessEmail', e.target.value)}
            icon={<Mail className="h-4 w-4" />}
          />
        </FormField>

        <FormField label="Phone number" required>
          <PremiumInput
            id="phone"
            type="tel"
            placeholder="+254 712 345 678"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            icon={<Phone className="h-4 w-4" />}
          />
        </FormField>
      </div>
    </div>
  )
}
