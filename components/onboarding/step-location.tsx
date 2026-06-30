'use client'

import { OnboardingHeader } from './onboarding-header'
import { FormField } from './form-field'
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
}

export function StepLocation({ data, onChange }: StepLocationProps) {
  const handleChange = (field: string, value: string) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  return (
    <div className="space-y-8">
      <OnboardingHeader
        title="Where are you located?"
        description="This helps us configure the right defaults for taxes, currency, and timezone"
        centered={true}
      />

      <div className="space-y-6">
        <FormField label="Country" required>
          <PremiumSelect
            id="country"
            value={data.country}
            onChange={(e) => handleChange('country', e.target.value)}
            options={[
              { value: '', label: 'Select a country' },
              ...COUNTRIES.map(c => ({ value: c, label: c }))
            ]}
          />
        </FormField>

        <FormField label="Timezone" required>
          <PremiumSelect
            id="timezone"
            value={data.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            options={[
              { value: '', label: 'Select a timezone' },
              ...TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))
            ]}
          />
        </FormField>
      </div>
    </div>
  )
}
