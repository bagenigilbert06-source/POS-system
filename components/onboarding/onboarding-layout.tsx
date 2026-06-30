import React from 'react'

interface OnboardingLayoutProps {
  children: React.ReactNode
  illustrationPanel?: React.ReactNode
  showLayout?: boolean
}

/**
 * Premium split-panel layout for onboarding
 * Left panel: Persistent branding + illustrations
 * Right panel: Centered form content (max-width 560-620px)
 */
export function OnboardingLayout({
  children,
  illustrationPanel,
  showLayout = true,
}: OnboardingLayoutProps) {
  if (!showLayout) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Panel - Persistent branding and illustrations */}
      {illustrationPanel && (
        <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[hsl(var(--section-dark-bg))] via-[hsl(221,80%,25%)] to-[hsl(var(--section-dark-bg))] p-12 lg:flex relative overflow-hidden">
          {/* Subtle gradient glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-[600px] w-[600px] rounded-full bg-blue-500/10 dark:bg-blue-400/5" />
          </div>

          <div className="relative z-10">{illustrationPanel}</div>
        </div>
      )}

      {/* Right Panel - Main content */}
      <div className={`flex flex-1 items-center justify-center relative overflow-hidden ${illustrationPanel ? 'p-6 md:p-12 bg-background' : 'w-full'}`}>
        {/* Subtle gradient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-start justify-end"
        >
          <div className="h-[500px] w-[500px] rounded-full bg-blue-600/[0.06] dark:bg-blue-500/[0.08]" />
        </div>

        <div className="w-full max-w-2xl relative z-10">
          {children}
        </div>
      </div>
    </div>
  )
}
