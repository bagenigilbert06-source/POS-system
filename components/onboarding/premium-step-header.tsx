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
    <div className={`space-y-4 mb-12 ${maxWidth}`}>
      {/* Step indicator */}
      <p className="text-sm font-semibold text-primary uppercase tracking-widest">
        Step {stepNumber} of {totalSteps}
      </p>

      {/* Title */}
      <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight text-balance">
        {title}
      </h2>

      {/* Description */}
      {description && (
        <p className="text-lg text-muted-foreground leading-relaxed text-balance">
          {description}
        </p>
      )}
    </div>
  )
}
