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
    <div className={`${ONBOARDING_PRESETS.stepHeader} mb-10 md:mb-12 ${maxWidth}`}>
      {/* Step indicator */}
      <p className={`${ONBOARDING_TOKENS.typography.stepIndicator} ${ONBOARDING_TOKENS.typography.stepIndicatorColor}`}>
        Step {stepNumber} of {totalSteps}
      </p>

      {/* Title */}
      <h2 className={ONBOARDING_PRESETS.stepTitle}>{title}</h2>

      {/* Description */}
      {description && (
        <p className={`${ONBOARDING_PRESETS.stepDescription} pt-2`}>{description}</p>
      )}
    </div>
  )
}
