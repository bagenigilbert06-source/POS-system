'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import type { OnboardingData } from './onboarding-container'

interface WorkspaceCreationScreenProps {
  organizationId: string
  onboardingData: OnboardingData
  /**
   * Called after the API confirms success and the final animation plays.
   * Receives the business-type dashboard route from the API response so the
   * parent can redirect to the correct dashboard (e.g. /dashboard/retail).
   */
  onComplete: (dashboardRoute: string) => void
}

/**
 * The steps shown in the UI map 1:1 to phases of the real backend operation.
 * Each label corresponds to a phase that the API actually performs.
 */
const CREATION_STEPS = [
  { id: 'setup',     label: 'Setting up your business profile' },
  { id: 'template',  label: 'Applying your business template' },
  { id: 'inventory', label: 'Creating starter categories & products' },
  { id: 'dashboard', label: 'Preparing your dashboard' },
  { id: 'final',     label: 'Finalising everything' },
]

type Phase = 'running' | 'success' | 'error'

export function WorkspaceCreationScreen({
  organizationId,
  onboardingData,
  onComplete,
}: WorkspaceCreationScreenProps) {
  const [phase, setPhase] = useState<Phase>('running')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [retrying, setRetrying] = useState(false)

  // Prevent double-calling in StrictMode
  const hasRun = useRef(false)

  const run = async () => {
    if (hasRun.current) return
    hasRun.current = true

    setPhase('running')
    setErrorMessage('')
    setActiveStep(0)
    setCompletedSteps([])

    try {
      // Fire the real API call immediately — timing of the UI steps is driven
      // by the actual promise, not by arbitrary setTimeout intervals.
      const apiPromise = fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, onboardingData }),
      })

      // Animate through the first four steps while the API is in-flight.
      // Each step takes ~600 ms so all four finish in ~2.4 s — enough for any
      // reasonably fast backend while still feeling immediate on fast networks.
      const STEP_DURATION_MS = 600
      for (let i = 0; i < CREATION_STEPS.length - 1; i++) {
        setActiveStep(i)
        await new Promise<void>((r) => setTimeout(r, STEP_DURATION_MS))
        setCompletedSteps((prev) => [...prev, CREATION_STEPS[i].id])
      }

      // Wait for the API before completing the final step
      setActiveStep(CREATION_STEPS.length - 1)
      const response = await apiPromise

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message || `Server error ${response.status}`)
      }

      const payload = await response.json()

      // Complete the last step
      setCompletedSteps(CREATION_STEPS.map((s) => s.id))
      setPhase('success')

      // Brief pause so the user sees the completed state, then hand off.
      // Pass the business-type dashboard route returned by the API so the
      // container can redirect to the correct dashboard (retail/restaurant/pharmacy).
      await new Promise<void>((r) => setTimeout(r, 1200))
      onComplete(payload?.dashboardRoute ?? '/dashboard')
    } catch (err) {
      hasRun.current = false // allow retry
      setPhase('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = async () => {
    setRetrying(true)
    await run()
    setRetrying(false)
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] py-12 text-center">
        <div className="mb-8 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Setup failed</h1>
        <p className="text-sm text-muted-foreground max-w-sm mb-2">
          {errorMessage}
        </p>
        <p className="text-xs text-muted-foreground/70 mb-10">
          Your progress is saved — only workspace creation needs to be retried.
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {retrying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Try again
        </button>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Running / success state
  // -------------------------------------------------------------------------
  const isSuccess = phase === 'success'

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] py-12">
      {/* Icon */}
      <div className="mb-12">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {isSuccess ? (
            <CheckCircle2 className="w-8 h-8 text-primary" />
          ) : (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          )}
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-3">
        {isSuccess ? 'Your workspace is ready!' : 'Creating your workspace\u2026'}
      </h1>

      {/* Subheading */}
      <p className="text-base text-muted-foreground text-center mb-12 max-w-md">
        {isSuccess
          ? `Welcome to IMARA! ${onboardingData.businessName} is ready.`
          : `Just a moment while we set up ${onboardingData.businessName || 'your business'}.`}
      </p>

      {/* Step list */}
      <div className="w-full max-w-md space-y-3">
        {CREATION_STEPS.map((step, index) => {
          const isDone = completedSteps.includes(step.id)
          const isActive = activeStep === index && !isDone

          return (
            <div key={step.id} className="flex items-center gap-4 transition-all duration-300">
              <div
                className={[
                  'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                  isDone
                    ? 'bg-primary border-primary'
                    : isActive
                      ? 'border-primary bg-primary/10 animate-pulse'
                      : 'border-muted-foreground/30',
                ].join(' ')}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                ) : isActive ? (
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>

              <span
                className={[
                  'text-sm font-medium transition-colors duration-300',
                  isDone ? 'text-primary' : isActive ? 'text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-12">
        {isSuccess ? (
          <p className="text-sm text-muted-foreground text-center">Redirecting to dashboard&hellip;</p>
        ) : (
          <p className="text-xs text-muted-foreground/70">Estimated time: 5&ndash;10 seconds</p>
        )}
      </div>
    </div>
  )
}
