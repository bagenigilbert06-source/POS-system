import { ONBOARDING_TOKENS, ONBOARDING_PRESETS } from '@/lib/onboarding/tokens'

interface PremiumStepHeaderProps {
  stepNumber: number
  totalSteps: number
  title: string
  description?: string
  maxWidth?: string
}

/**
 * Premium step header with step indicator, title, and description
 * Provides consistent heading hierarchy across all onboarding steps
 */
export function PremiumStepHeader({
  stepNumber,
  totalSteps,
  title,
  description,
  maxWidth = 'max-w-lg',
}: PremiumStepHeaderProps) {
  return (
    <div className={`${ONBOARDING_PRESETS.stepHeader} mb-8 md:mb-10 ${maxWidth}`}>
      {/* Step indicator */}
      <p className={`${ONBOARDING_TOKENS.typography.stepIndicator} ${ONBOARDING_TOKENS.typography.stepIndicatorColor} mb-2`}>
        Step {stepNumber} of {totalSteps}
      </p>

      {/* Title */}
      <h2 className={ONBOARDING_PRESETS.stepTitle}>{title}</h2>

      {/* Description */}
      {description && (
        <p className={`${ONBOARDING_PRESETS.stepDescription} mt-3`}>{description}</p>
      )}
    </div>
  )
}
