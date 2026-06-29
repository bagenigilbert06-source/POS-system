'use client'

interface OnboardingHeaderProps {
  title: string
  description?: string
  centered?: boolean
}

export function OnboardingHeader({ title, description, centered = true }: OnboardingHeaderProps) {
  return (
    <div className={`mb-10 ${centered ? 'text-center' : ''}`}>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base md:text-lg text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
