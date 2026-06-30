import React from 'react'

interface OnboardingLayoutProps {
  children: React.ReactNode
  illustrationPanel?: React.ReactNode
  showLayout?: boolean
}

/**
 * Premium clean centered layout for onboarding
 * Features subtle background, centered content with generous padding
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-primary/2">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Main content - Centered */}
      <div className="flex flex-1 items-center justify-center relative w-full px-4 py-8 md:px-6 md:py-12 lg:px-8 lg:py-16">
        <div className="w-full max-w-2xl relative z-10">
          {children}
        </div>
      </div>
    </div>
  )
}
