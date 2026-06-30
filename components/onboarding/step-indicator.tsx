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
    <div className="mb-12 space-y-4">
      {/* Step counter + title */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">
            Step {currentStep + 1} of {totalSteps}
          </p>
          <p className="text-sm font-medium text-muted-foreground mt-1">{stepTitle}</p>
        </div>
      </div>

      {/* Visual progress indicator */}
      <div className="flex gap-2 pt-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < currentStep
                ? 'bg-primary'
                : i === currentStep
                  ? 'bg-primary/50'
                  : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Percentage indicator */}
      <div className="flex justify-end">
        <span className="text-xs font-medium text-muted-foreground">
          {progressPercentage.toFixed(0)}% complete
        </span>
      </div>
    </div>
  )
}
