interface PremiumStepHeaderProps {
  stepNumber: number
  totalSteps: number
  title: string
  description?: string
  maxWidth?: string
}

export function PremiumStepHeader({ title, description }: PremiumStepHeaderProps) {
  return (
    <div className="mb-8">
      <h2
        style={{
          fontSize: '28px',
          fontWeight: 800,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          color: '#111827',
          fontFamily: 'var(--font-inter, Inter, sans-serif)',
          marginBottom: description ? '8px' : 0,
        }}
      >
        {title}
      </h2>
      {description && (
        <p
          style={{
            fontSize: '15px',
            lineHeight: 1.5,
            color: '#6b7280',
            fontFamily: 'var(--font-inter, Inter, sans-serif)',
          }}
        >
          {description}
        </p>
      )}
    </div>
  )
}
