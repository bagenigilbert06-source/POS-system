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
  maxWidth = 'max-w-2xl',
}: PremiumStepHeaderProps) {
  return (
    <div className={`space-y-3 mb-8 ${maxWidth}`}>
      {/* Step indicator */}
      <p className={`${ONBOARDING_TOKENS.typography.stepIndicator} ${ONBOARDING_TOKENS.typography.stepIndicatorColor}`}>
        Step {stepNumber} of {totalSteps}
      </p>

      {/* Title */}
      <h2 className={`${ONBOARDING_TOKENS.typography.heading} ${ONBOARDING_TOKENS.typography.headingColor} leading-tight`}>{title}</h2>

      {/* Description */}
      {description && (
        <p className={`${ONBOARDING_TOKENS.typography.description}`}>{description}</p>
      )}
    </div>
  )
}
