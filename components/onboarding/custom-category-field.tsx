'use client'

import { useEffect, useState } from 'react'
import { CategoryCombobox } from './category-combobox'
import { getCustomCategorySuggestions, getCustomCategoryDescription } from '@/lib/config/custom-categories'
import { BusinessTypeEnum } from '@/lib/types'

interface CustomCategoryFieldProps {
  businessType: string
  value: string
  onChange: (value: string) => void
  isVisible: boolean
}

export function CustomCategoryField({ businessType, value, onChange, isVisible }: CustomCategoryFieldProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isVisible) return null

  const suggestions = getCustomCategorySuggestions(businessType as BusinessTypeEnum)
  const description = getCustomCategoryDescription(businessType as BusinessTypeEnum)

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
      <div className="space-y-3">
        <label className="text-sm font-bold text-[#050816]">Tell us about your business</label>
        <p className="text-sm leading-6 text-zinc-600">
          We couldn&apos;t find the right category. Type your business below and we&apos;ll tailor Pesaby to your workflow.
        </p>
      </div>

      <CategoryCombobox
        suggestions={suggestions}
        value={value}
        onChange={onChange}
        placeholder="Search or type your business"
        description={description}
      />

      {value && (
        <div className="animate-in fade-in rounded-lg border border-[#e1b900] bg-[#fff4c4] p-3 duration-200">
          <p className="text-xs text-[#050816]">
            <span className="font-semibold">Selected:</span> {value}
          </p>
        </div>
      )}
    </div>
  )
}
