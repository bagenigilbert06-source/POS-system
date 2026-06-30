'use client'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  stepTitle: string
  isComplete?: boolean
}

export function StepIndicator({
  currentStep,
  totalSteps,
  stepTitle,
  isComplete = false,
}: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Step dots */}
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done = isComplete || i < currentStep
          const active = !isComplete && i === currentStep
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={[
                  'flex items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300',
                  done
                    ? 'h-7 w-7 bg-primary text-primary-foreground'
                    : active
                      ? 'h-7 w-7 bg-primary/10 text-primary ring-2 ring-primary/40 ring-offset-1'
                      : 'h-7 w-7 bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {done && !active ? (
                  <svg viewBox="0 0 12 12" fill="none" className="h-3.5 w-3.5">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < totalSteps - 1 && (
                <div className={[
                  'h-px w-6 transition-all duration-500',
                  i < currentStep ? 'bg-primary' : 'bg-border',
                ].join(' ')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step label */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        Step {currentStep + 1} of {totalSteps} &mdash; {stepTitle}
      </p>
    </div>
  )
}
