import React from 'react'
import { ONBOARDING_TOKENS } from '@/lib/onboarding/tokens'

interface OnboardingLeftPanelProps {
  stepNumber: number
  stepTitle: string
  stepDescription: string
  benefit1?: string
  benefit2?: string
  benefit3?: string
}

/**
 * Left panel for onboarding - Persistent branding with step-specific content
 * Shows progress, title, description, and key benefits for current step
 */
export function OnboardingLeftPanel({
  stepNumber,
  stepTitle,
  stepDescription,
  benefit1 = 'Personalized Setup',
  benefit2 = 'Easy Configuration',
  benefit3 = 'Ready to Use',
}: OnboardingLeftPanelProps) {
  return (
    <>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-16">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-sm font-bold text-white">I</span>
          </div>
          <span className="text-xl font-bold text-white">IMARA</span>
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-10">
        <div>
          {/* Progress indicator */}
          <p className="text-xs text-blue-300/70 font-medium uppercase tracking-widest mb-6">
            Step {stepNumber} of 7
          </p>

          {/* Title and description */}
          <h2 className="text-4xl font-semibold leading-tight text-white mb-6">
            {stepTitle}
          </h2>
          <p className="text-base text-blue-100/70 leading-relaxed max-w-md">
            {stepDescription}
          </p>
        </div>

        {/* Key benefits */}
        <div className="space-y-3 pt-2">
          {[
            { title: benefit1, desc: 'Tailored to your business type' },
            { title: benefit2, desc: 'Just a few simple steps' },
            { title: benefit3, desc: 'Start managing immediately' },
          ].map((feature) => (
            <div key={feature.title} className="flex items-start gap-3">
              <span className="text-blue-300 text-sm font-semibold flex-shrink-0">✓</span>
              <div>
                <span className="text-white text-sm font-medium">{feature.title}</span>
                <p className="text-blue-200/60 text-xs">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-blue-300/50 font-medium">
        &copy; {new Date().getFullYear()} IMARA. All rights reserved.
      </p>
    </>
  )
}
