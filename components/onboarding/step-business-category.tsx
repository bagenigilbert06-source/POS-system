'use client'

import { useMemo } from 'react'
import { getCategoriesForType } from '@/lib/types'
import { BUSINESS_TYPE_METADATA, BusinessTypeEnum } from '@/lib/types'
import { PremiumStepHeader } from './premium-step-header'
import { BusinessCategoryItem } from './business-category-item'
import { CustomCategoryField } from './custom-category-field'

interface StepBusinessCategoryProps {
  businessType: string
  value: string
  customCategory: string
  onChange: (value: string) => void
  onCustomCategoryChange: (value: string) => void
  stepNumber?: number
  totalSteps?: number
}

export function StepBusinessCategory({
  businessType,
  value,
  customCategory,
  onChange,
  onCustomCategoryChange,
  stepNumber = 2,
  totalSteps = 7,
}: StepBusinessCategoryProps) {
  const categories = useMemo(() => {
    if (!businessType) return []
    return getCategoriesForType(businessType as BusinessTypeEnum)
  }, [businessType])

  const businessTypeName = useMemo(() => {
    if (!businessType) return ''
    const metadata = BUSINESS_TYPE_METADATA[businessType as BusinessTypeEnum]
    return metadata?.name || ''
  }, [businessType])

  // Check if "Other" category is selected (last category in the list is typically "Other")
  const isOtherSelected = useMemo(() => {
    return categories.length > 0 && value === categories[categories.length - 1]?.id
  }, [value, categories])

  if (!categories.length) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-600">Please select a business type first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PremiumStepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        title={`Which ${businessTypeName.toLowerCase()} best fits your business?`}
        description="We'll configure features and defaults tailored to your specific category"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <BusinessCategoryItem
            key={category.id}
            id={category.id}
            name={category.name}
            selected={value === category.id}
            onClick={() => onChange(category.id)}
          />
        ))}
      </div>

      {/* Custom category reveal */}
      <CustomCategoryField
        businessType={businessType}
        value={customCategory}
        onChange={onCustomCategoryChange}
        isVisible={isOtherSelected}
      />

      <div className="space-y-2 rounded-xl border border-[#ead57a] bg-[#fff9df] p-5">
        <p className="text-sm font-bold text-[#050816]">Why we ask</p>
        <p className="text-sm leading-6 text-zinc-600">
          Your category helps us set up the right features, default product categories, and workflows for your specific business model. You can always customize these settings later from your account preferences.
        </p>
      </div>
    </div>
  )
}
