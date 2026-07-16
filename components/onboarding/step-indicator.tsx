'use client'

const STEP_LABELS = ['Business Type', 'Category', 'Details', 'Location', 'Team Size']

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  stepTitle: string
  isComplete?: boolean
}

export function StepIndicator({ currentStep, totalSteps, isComplete = false }: StepIndicatorProps) {
  return (
    <div className="mb-8" aria-label={`Step ${currentStep + 1} of ${totalSteps}`}>
      <div className="mb-4 flex gap-2" aria-hidden="true">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = isComplete || i < currentStep
          const active = !isComplete && i === currentStep
          return (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{
                background: done ? '#050816' : active ? '#ffda32' : '#e4e4e7',
              }}
            />
          )
        })}
      </div>

      <p className="text-center text-xs font-semibold text-zinc-500">
        Step {currentStep + 1} of {totalSteps}{STEP_LABELS[currentStep] ? ` — ${STEP_LABELS[currentStep]}` : ''}
      </p>
    </div>
  )
}
