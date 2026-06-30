'use client'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  stepTitle: string
  isComplete?: boolean
}

const STEP_LABELS = [
  'Business Type',
  'Category',
  'Details',
  'Location',
  'Team Size',
]

export function StepIndicator({
  currentStep,
  totalSteps,
  isComplete = false,
}: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Step track */}
      <div className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done   = isComplete || i < currentStep
          const active = !isComplete && i === currentStep
          const label  = STEP_LABELS[i] ?? `Step ${i + 1}`

          return (
            <div key={i} className="flex items-center flex-1 min-w-0">
              {/* Circle + label */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-200"
                  style={
                    done
                      ? { background: '#1a56db', color: '#fff' }
                      : active
                      ? { background: '#fff', color: '#1a56db', border: '2px solid #1a56db' }
                      : { background: '#f1f5f9', color: '#94a3b8', border: '1.5px solid #e2e8f0' }
                  }
                >
                  {done ? (
                    <svg viewBox="0 0 10 10" fill="none" className="h-3 w-3">
                      <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className="hidden sm:block text-[10px] font-medium whitespace-nowrap"
                  style={{ color: active ? '#1a56db' : done ? '#64748b' : '#94a3b8' }}
                >
                  {label}
                </span>
              </div>

              {/* Connector */}
              {i < totalSteps - 1 && (
                <div
                  className="flex-1 h-px mx-2 mb-4 transition-all duration-300"
                  style={{ background: i < currentStep ? '#1a56db' : '#e2e8f0' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Current step label */}
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>
        Step {currentStep + 1} of {totalSteps} &mdash; {STEP_LABELS[currentStep]}
      </p>
    </div>
  )
}
