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
  const progressPercentage = isComplete ? 100 : ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="mb-10 space-y-3">
      {/* Step counter + title */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Step {currentStep + 1} of {totalSteps}
        </p>
        <p className="text-xs font-medium text-muted-foreground">{stepTitle}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Dot track */}
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={[
              'h-1 flex-1 rounded-full transition-all duration-300',
              i < currentStep
                ? 'bg-primary'
                : i === currentStep
                  ? 'bg-primary/60'
                  : 'bg-muted',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  )
}
