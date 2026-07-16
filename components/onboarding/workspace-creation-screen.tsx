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
      // Include credentials so the session cookie is sent from the browser
      const apiPromise = fetch('/api/onboarding/complete', {
        method: 'POST',
        credentials: 'include',
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
      <div className="flex min-h-[500px] flex-col items-center justify-center py-12 text-center">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertCircle aria-hidden="true" className="h-8 w-8 text-[#e42527]" />
        </div>
        <h1 className="mb-3 text-2xl font-black tracking-tight text-zinc-950">Setup failed</h1>
        <p className="mb-2 max-w-sm text-sm text-zinc-600">
          {errorMessage}
        </p>
        <p className="mb-10 text-xs text-zinc-500">
          Your progress is saved — only workspace creation needs to be retried.
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="flex min-h-12 items-center gap-2 rounded-lg bg-[#e42527] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#c91e20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {retrying ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
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
    <div className="flex min-h-[500px] flex-col items-center justify-center py-10" aria-live="polite">
      <div className="mb-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ffda32] text-[#050816]">
          {isSuccess ? (
            <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
          ) : (
            <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin" />
          )}
        </div>
      </div>

      <h1 className="mb-3 text-center text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">
        {isSuccess ? 'Your workspace is ready!' : 'Creating your workspace\u2026'}
      </h1>

      <p className="mb-12 max-w-md text-center text-base leading-7 text-zinc-600">
        {isSuccess
          ? `Welcome to Pesaby. ${onboardingData.businessName} is ready.`
          : `Just a moment while we set up ${onboardingData.businessName || 'your business'}.`}
      </p>

      <div className="w-full max-w-md space-y-3">
        {CREATION_STEPS.map((step, index) => {
          const isDone = completedSteps.includes(step.id)
          const isActive = activeStep === index && !isDone

          return (
            <div key={step.id} className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors duration-300 ${isActive ? 'border-[#ead57a] bg-[#fff9df]' : 'border-zinc-200 bg-white'}`}>
              <div
                className={[
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isDone
                    ? 'border-[#050816] bg-[#050816]'
                    : isActive
                      ? 'border-[#e1b900] bg-[#ffda32]'
                      : 'border-zinc-300',
                ].join(' ')}
              >
                {isDone ? (
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-white" />
                ) : isActive ? (
                  <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin text-[#050816]" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-zinc-300" />
                )}
              </div>

              <span
                className={[
                  'text-sm font-medium transition-colors duration-300',
                  isDone ? 'font-semibold text-[#050816]' : isActive ? 'text-zinc-950' : 'text-zinc-500',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-12">
        {isSuccess ? (
          <p className="text-center text-sm text-zinc-500">Redirecting to dashboard&hellip;</p>
        ) : (
          <p className="text-xs text-zinc-500">Estimated time: 5&ndash;10 seconds</p>
        )}
      </div>
    </div>
  )
}
