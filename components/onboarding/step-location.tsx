'use client'

import { cn } from '@/lib/utils'

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Where are you located?</h2>
        <p className="text-muted-foreground">This helps us set the right defaults for your business</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-foreground mb-2">
            Country
          </label>
          <select
            id="country"
            required
            value={data.country}
            onChange={(e) => handleChange('country', e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150'
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
          <label htmlFor="timezone" className="block text-sm font-medium text-foreground mb-2">
            Timezone
          </label>
          <select
            id="timezone"
            required
            value={data.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150'
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
