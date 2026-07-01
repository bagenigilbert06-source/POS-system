interface PremiumStepHeaderProps {
  stepNumber: number
  totalSteps: number
  title: string
  description?: string
  maxWidth?: string
}

export function PremiumStepHeader({ title, description }: PremiumStepHeaderProps) {
  return (
    <div className="mb-7 text-center">
      <h2 className="text-2xl font-black leading-tight tracking-tight text-zinc-950">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-600">
          {description}
        </p>
      )}
    </div>
  )
}
