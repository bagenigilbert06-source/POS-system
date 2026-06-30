'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

interface WorkspaceCreationScreenProps {
  organizationId: string
  onboardingData: {
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
}

const CREATION_STEPS = [
  { id: 'setup', label: 'Setting up your business' },
  { id: 'template', label: 'Applying your business template' },
  { id: 'inventory', label: 'Configuring modules' },
  { id: 'dashboard', label: 'Preparing your dashboard' },
  { id: 'final', label: 'Finalizing everything' },
]

export function WorkspaceCreationScreen({
  organizationId,
  onboardingData,
}: WorkspaceCreationScreenProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let isMounted = true
    let currentStepIndex = 0

    const completeOnboarding = async () => {
      try {
        // Simulate step completion
        const stepInterval = setInterval(() => {
          if (currentStepIndex < CREATION_STEPS.length && isMounted) {
            const stepId = CREATION_STEPS[currentStepIndex].id
            setCompletedSteps((prev) => [...prev, stepId])
            setCurrentStep(currentStepIndex + 1)
            currentStepIndex++
          } else {
            clearInterval(stepInterval)
            // Call API to complete onboarding
            completeOnboardingAPI()
          }
        }, 1200)
      } catch (error) {
        console.error('Error during workspace creation:', error)
      }
    }

    const completeOnboardingAPI = async () => {
      try {
        const response = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            onboardingData,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to complete onboarding')
        }

        if (isMounted) {
          setIsComplete(true)
          // Redirect to dashboard after 1 second
          setTimeout(() => {
            router.push('/dashboard')
            router.refresh()
          }, 1000)
        }
      } catch (error) {
        console.error('Onboarding completion error:', error)
      }
    }

    completeOnboarding()

    return () => {
      isMounted = false
    }
  }, [organizationId, onboardingData, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] py-12">
      {/* Animated Logo/Icon */}
      <div className="mb-12">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {isComplete ? (
            <CheckCircle2 className="w-8 h-8 text-primary animate-bounce" />
          ) : (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          )}
        </div>
      </div>

      {/* Main heading */}
      <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-3">
        {isComplete ? "Your workspace is ready!" : "Creating your workspace..."}
      </h1>

      {/* Subheading */}
      <p className="text-base text-muted-foreground text-center mb-12 max-w-md">
        {isComplete
          ? "We've set everything up. Welcome to IMARA!"
          : `Just a moment while we set up ${onboardingData.businessName}`}
      </p>

      {/* Progress steps */}
      <div className="w-full max-w-md space-y-3">
        {CREATION_STEPS.map((step, index) => (
          <div
            key={step.id}
            className="flex items-center gap-4 transition-all duration-300"
          >
            {/* Step indicator */}
            <div
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                completedSteps.includes(step.id)
                  ? 'bg-primary border-primary'
                  : currentStep === index
                    ? 'border-primary bg-primary/10 animate-pulse'
                    : 'border-muted-foreground/30'
              }`}
            >
              {completedSteps.includes(step.id) ? (
                <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
              ) : currentStep === index ? (
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
              )}
            </div>

            {/* Step label */}
            <span
              className={`text-sm font-medium transition-colors duration-300 ${
                completedSteps.includes(step.id)
                  ? 'text-primary'
                  : currentStep === index
                    ? 'text-foreground'
                    : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Estimated time */}
      {!isComplete && (
        <p className="text-xs text-muted-foreground/70 mt-12">
          Estimated time: 5–10 seconds
        </p>
      )}

      {/* Success message */}
      {isComplete && (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </div>
      )}
    </div>
  )
}
