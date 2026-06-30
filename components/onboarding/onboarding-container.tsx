'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { StepBusinessType } from './step-business-type'
import { StepBusinessCategory } from './step-business-category'
import { StepBusinessDetails } from './step-business-details'
import { StepLocation } from './step-location'
import { StepBusinessSize } from './step-business-size'
import { WorkspaceCreationScreen } from './workspace-creation-screen'
import { StepIndicator } from './step-indicator'
import { StepFooter } from './step-footer'
import { getCategoriesForType } from '@/lib/types'

// Steps that are part of the visible wizard (not workspace creation)
const WIZARD_STEPS = [
  { id: 'business-type', title: 'Business Type' },
  { id: 'business-category', title: 'Business Category' },
  { id: 'business-details', title: 'Business Details' },
  { id: 'location', title: 'Location' },
  { id: 'business-size', title: 'Business Size' },
]

export interface OnboardingData {
  businessType: string
  businessCategory: string
  customCategory: string
  businessName: string
  businessEmail: string
  phone: string
  country: string
  timezone: string
  businessSize: string
}

interface OnboardingContainerProps {
  organizationId: string
  userId: string
  /** Step to resume from (0-based index into WIZARD_STEPS). Defaults to 0. */
  initialStep?: number
  /** Pre-filled data from the DB when resuming. */
  initialData?: Partial<OnboardingData>
}

export function OnboardingContainer({
  organizationId,
  userId,
  initialStep = 0,
  initialData = {},
}: OnboardingContainerProps) {
  const router = useRouter()

  // Clamp so we never start beyond the last wizard step
  const clampedInitial = Math.min(Math.max(0, initialStep), WIZARD_STEPS.length - 1)

  const [currentStep, setCurrentStep] = useState(clampedInitial)
  /** When true the workspace creation screen is shown */
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [data, setData] = useState<OnboardingData>({
    businessType: initialData.businessType ?? '',
    businessCategory: initialData.businessCategory ?? '',
    customCategory: initialData.customCategory ?? '',
    businessName: initialData.businessName ?? '',
    businessEmail: initialData.businessEmail ?? '',
    phone: initialData.phone ?? '',
    country: initialData.country ?? '',
    timezone: initialData.timezone ?? 'Africa/Nairobi',
    businessSize: initialData.businessSize ?? '',
  })

  const step = WIZARD_STEPS[currentStep]
  const isLastWizardStep = currentStep === WIZARD_STEPS.length - 1

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  const validateStep = useCallback((): boolean => {
    switch (step.id) {
      case 'business-type':
        return !!data.businessType
      case 'business-category': {
        const categories = getCategoriesForType(data.businessType as any)
        const lastCatId = categories[categories.length - 1]?.id
        const isOther = !!lastCatId && data.businessCategory === lastCatId
        if (isOther) return !!data.businessCategory && !!data.customCategory
        return !!data.businessCategory
      }
      case 'business-details':
        return !!data.businessName && !!data.businessEmail && !!data.phone
      case 'location':
        return !!data.country && !!data.timezone
      case 'business-size':
        return !!data.businessSize
      default:
        return false
    }
  }, [step.id, data])

  // -------------------------------------------------------------------------
  // Per-step persistence — fire and forget; never blocks the UI
  // -------------------------------------------------------------------------
  const persistStep = useCallback(
    async (stepIndex: number, stepData: Record<string, any>) => {
      try {
        await fetch('/api/onboarding/save-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId, step: stepIndex, stepData }),
        })
      } catch {
        // Non-critical — ignore silently
      }
    },
    [organizationId]
  )

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  const handleNext = useCallback(async () => {
    setError('')

    if (!validateStep()) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)

    // Persist current step to DB before advancing
    await persistStep(currentStep, {
      businessType: data.businessType,
      businessCategory: data.businessCategory,
      customCategory: data.customCategory,
      name: data.businessName,
      businessEmail: data.businessEmail,
      phone: data.phone,
      country: data.country,
      timezone: data.timezone,
      businessSize: data.businessSize,
    })

    setSaving(false)

    if (isLastWizardStep) {
      // All wizard steps done — hand off to WorkspaceCreationScreen
      setShowWorkspace(true)
    } else {
      setCurrentStep((s) => s + 1)
    }
  }, [currentStep, isLastWizardStep, data, validateStep, persistStep])

  const handlePrevious = useCallback(() => {
    setError('')
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }, [currentStep])

  const handleUpdate = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
    setError('')
  }, [])

  // -------------------------------------------------------------------------
  // Workspace creation callback — called by WorkspaceCreationScreen on success.
  // The dashboardRoute is returned by the API and is the correct business-type
  // dashboard (e.g. /dashboard/retail, /dashboard/restaurant, /dashboard/pharmacy).
  // -------------------------------------------------------------------------
  const handleWorkspaceComplete = useCallback((dashboardRoute: string) => {
    router.push(dashboardRoute)
    router.refresh()
  }, [router])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (showWorkspace) {
    return (
      <WorkspaceCreationScreen
        organizationId={organizationId}
        onboardingData={data}
        onComplete={handleWorkspaceComplete}
      />
    )
  }

  const renderStep = () => {
    switch (step.id) {
      case 'business-type':
        return (
          <StepBusinessType
            value={data.businessType}
            onChange={(value) => handleUpdate({ businessType: value, businessCategory: '', customCategory: '' })}
            stepNumber={currentStep + 1}
            totalSteps={WIZARD_STEPS.length}
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
            totalSteps={WIZARD_STEPS.length}
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
            totalSteps={WIZARD_STEPS.length}
          />
        )
      case 'location':
        return (
          <StepLocation
            data={{ country: data.country, timezone: data.timezone }}
            onChange={(updates) => handleUpdate(updates)}
            stepNumber={currentStep + 1}
            totalSteps={WIZARD_STEPS.length}
          />
        )
      case 'business-size':
        return (
          <StepBusinessSize
            value={data.businessSize}
            onChange={(value) => handleUpdate({ businessSize: value })}
            stepNumber={currentStep + 1}
            totalSteps={WIZARD_STEPS.length}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-0">
      <StepIndicator
        currentStep={currentStep}
        totalSteps={WIZARD_STEPS.length}
        stepTitle={step.title}
        isComplete={false}
      />

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-5 py-4 mb-8 text-sm animate-fade-up">
          <p className="font-medium text-destructive">{error}</p>
        </div>
      )}

      <div className="mb-16 animate-fade-up">{renderStep()}</div>

      <StepFooter
        onBack={handlePrevious}
        onNext={handleNext}
        backDisabled={currentStep === 0}
        nextDisabled={!validateStep()}
        loading={saving}
        nextLabel={isLastWizardStep ? 'Create Workspace' : 'Continue'}
        showBack={true}
      />
    </div>
  )
}
