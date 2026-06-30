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
    <div className="mb-10 space-y-3">
      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  )
}
