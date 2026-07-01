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
    <div className="mb-8">
      <div className="mb-4 flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = isComplete || i < currentStep
          const active = !isComplete && i === currentStep
          return (
            <div
              key={i}
              className="flex-1 h-[3px] rounded-full transition-all duration-300"
              style={{
                background: done ? '#005a43' : active ? '#2f7d65' : '#e5e7eb',
              }}
            />
          )
        })}
      </div>

      <p className="text-center text-[12px] font-semibold text-zinc-500">
        Step {currentStep + 1} of {totalSteps}{STEP_LABELS[currentStep] ? ` — ${STEP_LABELS[currentStep]}` : ''}
      </p>
    </div>
  )
}
