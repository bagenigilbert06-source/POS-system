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
    <div className="mb-12 space-y-4">
      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
            {isComplete ? 'Setup Complete' : `Step ${currentStep + 1} of ${totalSteps - 1}`}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{stepTitle}</h1>
        </div>
      </div>
    </div>
  )
}
