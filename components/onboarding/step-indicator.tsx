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
  const progressPercentage = isComplete ? 100 : ((currentStep + 1) / (totalSteps - 1)) * 100

  return (
    <div className="mb-12 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            {isComplete ? 'Complete!' : `Step ${currentStep + 1} of ${totalSteps - 1}`}
          </p>
          <h1 className="text-xl font-semibold text-foreground">{stepTitle}</h1>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary to-primary/70 h-1.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  )
}
