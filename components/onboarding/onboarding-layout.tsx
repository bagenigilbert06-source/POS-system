import React from 'react'

interface OnboardingLayoutProps {
  children: React.ReactNode
  illustrationPanel?: React.ReactNode
  showLayout?: boolean
}

/**
 * Modern clean centered layout for onboarding
 * Full-width centered design with max-width constraint
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
      {/* Main content - Centered */}
      <div className="flex flex-1 items-center justify-center relative overflow-hidden w-full p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-3xl relative z-10">
          {children}
        </div>
      </div>
    </div>
  )
}
