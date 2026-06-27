'use client'

import { cn } from '@/lib/utils'

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Tell us about your business</h2>
        <p className="text-muted-foreground">We&apos;ll use this to personalize your experience</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-foreground mb-2">
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
              'w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none',
              'placeholder:text-muted-foreground',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150'
            )}
          />
        </div>

        <div>
          <label htmlFor="businessEmail" className="block text-sm font-medium text-foreground mb-2">
            Business email
          </label>
          <input
            id="businessEmail"
            type="email"
            placeholder="business@example.com"
            value={data.businessEmail}
            onChange={(e) => handleChange('businessEmail', e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none',
              'placeholder:text-muted-foreground',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150'
            )}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="+254 712 345 678"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={cn(
              'w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none',
              'placeholder:text-muted-foreground',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-all duration-150'
            )}
          />
        </div>
      </div>
    </div>
  )
}
