import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight, Lightbulb } from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  href: string
  completed: boolean
  icon: React.ReactNode
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[]
}

export function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const completedCount = steps.filter((s) => s.completed).length
  const completionPercentage = Math.round((completedCount / steps.length) * 100)

  if (completionPercentage === 100) return null

  return (
    <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-gradient-to-br from-[#f8f9fc] to-[#fafbfc] shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e7f0ff]">
              <Lightbulb className="h-4 w-4 text-[#004ee6]" />
            </div>
            <div>
              <h2 className="text-[0.95rem] font-bold text-[#101828]">Get started</h2>
              <p className="mt-1 text-xs text-[#7b8495]">Complete setup to unlock full features</p>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#004ee6] px-2.5 py-1 text-[0.7rem] font-bold text-white flex-shrink-0">
            {completionPercentage}%
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-full bg-[#e3e8ee]">
          <div
            className="h-2 bg-gradient-to-r from-[#004ee6] to-[#0066ff] transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-[#edf0f4] px-5">
        {steps.map((step, index) => (
          <Link
            key={step.id}
            href={step.href}
            className="group flex items-start gap-3 py-4 transition-colors hover:bg-[#ffffff]/50"
          >
            <div className="flex-shrink-0 mt-1">
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-[#116d4f]" />
              ) : (
                <Circle className="h-5 w-5 text-[#c7cdd8]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${step.completed ? 'text-[#8a94a5] line-through' : 'text-[#101828]'}`}>
                {step.title}
              </p>
              <p className={`mt-0.5 text-xs ${step.completed ? 'text-[#c7cdd8]' : 'text-[#667085]'}`}>
                {step.description}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#c7cdd8] transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </article>
  )
}
