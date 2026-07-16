'use client'

import { Globe, Clock } from 'lucide-react'
import { PremiumStepHeader } from './premium-step-header'
import { PremiumSelect } from './premium-select'

const COUNTRIES = [
  'Kenya',
  'Uganda',
  'Tanzania',
  'Rwanda',
  'Ethiopia',
  'Nigeria',
  'South Africa',
  'Other',
]

const TIMEZONES = [
  { value: 'Africa/Nairobi', label: 'East Africa (Nairobi) - UTC+3' },
  { value: 'Africa/Kampala', label: 'Central Africa (Kampala) - UTC+3' },
  { value: 'Africa/Dar_es_Salaam', label: 'East Africa (Dar es Salaam) - UTC+3' },
  { value: 'Africa/Kigali', label: 'Central Africa (Kigali) - UTC+2' },
  { value: 'Africa/Addis_Ababa', label: 'East Africa (Addis Ababa) - UTC+3' },
  { value: 'Africa/Lagos', label: 'West Africa (Lagos) - UTC+1' },
  { value: 'Africa/Johannesburg', label: 'Southern Africa (Johannesburg) - UTC+2' },
]

interface StepLocationProps {
  data: {
    country: string
    timezone: string
  }
  onChange: (data: any) => void
  stepNumber?: number
  totalSteps?: number
}

export function StepLocation({
  data,
  onChange,
  stepNumber = 4,
  totalSteps = 7,
}: StepLocationProps) {
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
        title="Where are you located?"
        description="We’ll configure the right currency, timezone, and regional defaults."
      />

      <div className="space-y-6">
        <PremiumSelect
          label="Country"
          required
          value={data.country}
          onChange={(e) => handleChange('country', e.target.value)}
          options={[
            { value: '', label: 'Select a country', disabled: true },
            ...COUNTRIES.map(country => ({ value: country, label: country }))
          ]}
          description="Used for tax and legal defaults"
        />

        <PremiumSelect
          label="Timezone"
          required
          value={data.timezone}
          onChange={(e) => handleChange('timezone', e.target.value)}
          options={[
            { value: '', label: 'Select a timezone', disabled: true },
            ...TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))
          ]}
          description="Used for scheduling and reporting"
        />
      </div>
    </div>
  )
}
