'use client'

import { cn } from '@/lib/utils'
import { OnboardingHeader } from './onboarding-header'

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

      <div className="space-y-5">
        <div>
          <label htmlFor="country" className="block text-sm font-semibold text-foreground mb-2">
            Country
          </label>
          <select
            id="country"
            required
            value={data.country}
            onChange={(e) => handleChange('country', e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-card px-4 py-3 text-sm outline-none appearance-none',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150 shadow-sm-soft cursor-pointer',
              'bg-[url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3e%3cpath fill=%27none%27 stroke=%27%23597b8e%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m2 5 6 6 6-6%27/%3e%3c/svg%3e")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] pr-10'
            )}
          >
            <option value="">Select a country</option>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-semibold text-foreground mb-2">
            Timezone
          </label>
          <select
            id="timezone"
            required
            value={data.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-card px-4 py-3 text-sm outline-none appearance-none',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150 shadow-sm-soft cursor-pointer',
              'bg-[url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 16 16%27%3e%3cpath fill=%27none%27 stroke=%27%23597b8e%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27m2 5 6 6 6-6%27/%3e%3c/svg%3e")] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.5em_1.5em] pr-10'
            )}
          >
            <option value="">Select a timezone</option>
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
