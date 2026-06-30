interface PremiumStepHeaderProps {
  stepNumber: number
  totalSteps: number
  title: string
  description?: string
  maxWidth?: string
}

/**
 * Clean Zoho/Odoo-style step header.
 * Bold title, muted description — no decorative pill or badge.
 */
export function PremiumStepHeader({
  stepNumber,
  totalSteps,
  title,
  description,
  maxWidth = 'max-w-lg',
}: PremiumStepHeaderProps) {
  return (
    <div className={`space-y-2 mb-8 ${maxWidth}`}>
      <h2 className="text-2xl font-bold text-foreground tracking-tight leading-snug">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
