'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { StepBusinessType } from './step-business-type'
import { StepBusinessCategory } from './step-business-category'
import { StepBusinessDetails } from './step-business-details'
import { StepLocation } from './step-location'
import { StepBusinessSize } from './step-business-size'
import { WorkspaceCreationScreen } from './workspace-creation-screen'
import { StepIndicator } from './step-indicator'
import { StepFooter } from './step-footer'

const STEPS = [
  { id: 'business-type', title: 'Business Type', component: StepBusinessType },
  { id: 'business-category', title: 'Business Category', component: StepBusinessCategory },
  { id: 'business-details', title: 'Business Details', component: StepBusinessDetails },
  { id: 'location', title: 'Location', component: StepLocation },
  { id: 'business-size', title: 'Business Size', component: StepBusinessSize },
  { id: 'workspace-creation', title: 'Workspace Creation', component: WorkspaceCreationScreen },
]

interface OnboardingData {
  businessType: string
  businessCategory: string
  customCategory: string
  businessName: string
  businessEmail: string
  phone: string
  country: string
  timezone: string
  businessSize: string
  workspaceCompleted: string[]
}

interface OnboardingContainerProps {
  organizationId: string
  userId: string
}

export function OnboardingContainer({ organizationId, userId }: OnboardingContainerProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData>({
    businessType: '',
    businessCategory: '',
    customCategory: '',
    businessName: '',
    businessEmail: '',
    phone: '',
    country: '',
    timezone: 'Africa/Nairobi',
    businessSize: '',
    workspaceCompleted: [],
  })

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const isWelcomeStep = step.id === 'welcome'

  const handleNext = useCallback(async () => {
    if (isLastStep) {
      // Complete onboarding
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            onboardingData: data,
          }),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.message || 'Failed to complete onboarding')
        }

        router.push('/dashboard')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setLoading(false)
      }
      return
    }

    // Validate current step
    if (!validateStep()) {
      setError('Please fill in all required fields')
      return
    }

    // Move to next step
    setCurrentStep(currentStep + 1)
    setError('')
  }, [currentStep, isLastStep, data, organizationId])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setError('')
    }
  }, [currentStep])

  const validateStep = (): boolean => {
    switch (step.id) {
      case 'business-type':
        return !!data.businessType
      case 'business-category': {
        // Get the categories for the business type to find "Other"
        const { getCategoriesForType } = require('@/lib/types')
        const categories = getCategoriesForType(data.businessType)
        const isOtherSelected = categories.length > 0 && data.businessCategory === categories[categories.length - 1]?.id
        
        // If "Other" is selected, require custom category
        if (isOtherSelected) {
          return !!data.businessCategory && !!data.customCategory
        }
        
        return !!data.businessCategory
      }
      case 'business-details':
        return !!data.businessName && !!data.businessEmail && !!data.phone
      case 'location':
        return !!data.country && !!data.timezone
      case 'business-size':
        return !!data.businessSize
      case 'workspace-creation':
        return true
      default:
        return false
    }
  }

  const handleUpdate = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const handleWorkspaceToggle = (id: string) => {
    setData((prev) => ({
      ...prev,
      workspaceCompleted: prev.workspaceCompleted.includes(id)
        ? prev.workspaceCompleted.filter((item) => item !== id)
        : [...prev.workspaceCompleted, id],
    }))
  }

  const renderStep = () => {
    switch (step.id) {
      case 'business-type':
        return (
          <StepBusinessType
            value={data.businessType}
            onChange={(value) => handleUpdate({ businessType: value })}
            stepNumber={currentStep + 1}
            totalSteps={STEPS.length}
          />
        )
      case 'business-category':
        return (
          <StepBusinessCategory
            businessType={data.businessType}
            value={data.businessCategory}
            customCategory={data.customCategory}
            onChange={(value) => handleUpdate({ businessCategory: value })}
            onCustomCategoryChange={(value) => handleUpdate({ customCategory: value })}
            stepNumber={currentStep + 1}
            totalSteps={STEPS.length}
          />
        )
      case 'business-details':
        return (
          <StepBusinessDetails
            data={{
              businessName: data.businessName,
              businessEmail: data.businessEmail,
              phone: data.phone,
            }}
            onChange={(updates) => handleUpdate(updates)}
            stepNumber={currentStep + 1}
            totalSteps={STEPS.length}
          />
        )
      case 'location':
        return (
          <StepLocation
            data={{
              country: data.country,
              timezone: data.timezone,
            }}
            onChange={(updates) => handleUpdate(updates)}
            stepNumber={currentStep + 1}
            totalSteps={STEPS.length}
          />
        )
      case 'business-size':
        return (
          <StepBusinessSize
            value={data.businessSize}
            onChange={(value) => handleUpdate({ businessSize: value })}
            stepNumber={currentStep + 1}
            totalSteps={STEPS.length}
          />
        )
      case 'workspace-creation':
        return (
          <WorkspaceCreationScreen
            organizationId={organizationId}
            onboardingData={data}
          />
        )
      default:
        return null
    }
  }

  const isWorkspaceCreationStep = step.id === 'workspace-creation'

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-0">
      {/* Progress indicator - hide for workspace creation */}
      {!isWorkspaceCreationStep && (
        <StepIndicator
          currentStep={currentStep}
          totalSteps={STEPS.length}
          stepTitle={step.title}
          isComplete={false}
        />
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-5 py-4 mb-8 text-sm animate-fade-up">
          <p className="font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className={isWorkspaceCreationStep ? '' : 'mb-16 animate-fade-up'}>{renderStep()}</div>

      {/* Action buttons - hide for workspace creation */}
      {!isWorkspaceCreationStep && (
        <StepFooter
          onBack={handlePrevious}
          onNext={handleNext}
          backDisabled={currentStep === 0}
          nextDisabled={!validateStep()}
          loading={loading}
          nextLabel={isLastStep ? 'Create Workspace' : 'Continue'}
          showBack={true}
        />
      )}
    </div>
  )
}
