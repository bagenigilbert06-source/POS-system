interface PremiumStepHeaderProps {
  stepNumber: number
  totalSteps: number
  title: string
  description?: string
  maxWidth?: string
}

/**
 * Zoho-style step heading — large bold title, calm muted description.
 */
export function PremiumStepHeader({
  title,
  description,
  maxWidth = 'max-w-xl',
}: PremiumStepHeaderProps) {
  return (
    <div className={`${maxWidth} mb-8`}>
      <h2
        className="text-[26px] font-bold leading-tight tracking-tight mb-2"
        style={{ color: '#0f172a' }}
      >
        {title}
      </h2>
      {description && (
        <p className="text-[15px] leading-relaxed" style={{ color: '#64748b' }}>
          {description}
        </p>
      )}
    </div>
  )
}
