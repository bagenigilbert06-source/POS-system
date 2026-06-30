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
    <div className="mb-10">
      {/* Shopify-style thin segmented progress bar */}
      <div className="flex gap-1.5 mb-4">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = isComplete || i < currentStep
          const active = !isComplete && i === currentStep
          return (
            <div
              key={i}
              className="flex-1 h-[3px] rounded-full transition-all duration-300"
              style={{
                background: done ? '#111827' : active ? '#6b7280' : '#e5e7eb',
              }}
            />
          )
        })}
      </div>

      {/* Step label */}
      <p
        className="text-[12px] font-medium"
        style={{
          color: '#9ca3af',
          fontFamily: 'var(--font-inter, Inter, sans-serif)',
          letterSpacing: '0.01em',
        }}
      >
        Step {currentStep + 1} of {totalSteps}{STEP_LABELS[currentStep] ? ` — ${STEP_LABELS[currentStep]}` : ''}
      </p>
    </div>
  )
}
