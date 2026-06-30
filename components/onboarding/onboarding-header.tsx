'use client'

interface OnboardingHeaderProps {
  title: string
  description?: string
  centered?: boolean
}

export function OnboardingHeader({ title, description, centered = true }: OnboardingHeaderProps) {
  return (
    <div className={`mb-12 ${centered ? 'text-center' : ''}`}>
      <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight text-balance">
        {title}
      </h1>
      {description && (
        <p className="mt-4 text-lg md:text-xl text-muted-foreground leading-relaxed text-balance">
          {description}
        </p>
      )}
    </div>
  )
}
