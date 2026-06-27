'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import { StepBusinessType } from './step-business-type'
import { StepBusinessDetails } from './step-business-details'
import { StepLocation } from './step-location'
import { StepBusinessSize } from './step-business-size'
import { StepWorkspaceSetup } from './step-workspace-setup'
import { StepWelcome } from './step-welcome'

const STEPS = [
  { id: 'business-type', title: 'Business Type', component: StepBusinessType },
  { id: 'business-details', title: 'Business Details', component: StepBusinessDetails },
  { id: 'location', title: 'Location', component: StepLocation },
  { id: 'business-size', title: 'Business Size', component: StepBusinessSize },
  { id: 'workspace-setup', title: 'Workspace Setup', component: StepWorkspaceSetup },
  { id: 'welcome', title: 'Welcome', component: StepWelcome },
]

interface OnboardingData {
  businessType: string
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
      case 'business-details':
        return !!data.businessName && !!data.businessEmail && !!data.phone
      case 'location':
        return !!data.country && !!data.timezone
      case 'business-size':
        return !!data.businessSize
      case 'workspace-setup':
      case 'welcome':
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
          />
        )
      case 'business-size':
        return (
          <StepBusinessSize
            value={data.businessSize}
            onChange={(value) => handleUpdate({ businessSize: value })}
          />
        )
      case 'workspace-setup':
        return (
          <StepWorkspaceSetup
            completed={data.workspaceCompleted}
            onToggle={handleWorkspaceToggle}
          />
        )
      case 'welcome':
        return <StepWelcome businessName={data.businessName} />
      default:
        return null
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">
                {isWelcomeStep ? 'Done!' : `Step ${currentStep + 1} of ${STEPS.length - 1}`}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${isWelcomeStep ? 100 : ((currentStep + 1) / (STEPS.length - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 mb-6 text-sm">
          <p className="font-medium text-destructive">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="mb-8">{renderStep()}</div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className={cn(
            'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150',
            'border border-border text-foreground',
            'hover:bg-muted active:bg-muted/80',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={loading}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90 active:bg-primary/80',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
            'shadow-md shadow-primary/20'
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLastStep ? 'Complete Setup' : 'Continue'}
        </button>
      </div>

      {isWelcomeStep && (
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
