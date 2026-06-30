import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OnboardingContainer } from '@/components/onboarding/onboarding-container'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import { OnboardingLeftPanel } from '@/components/onboarding/onboarding-left-panel'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Setup Your Business' }

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  // In a real app, you'd fetch the user's organization from DB
  // For now, we'll create a placeholder - this will be improved with proper auth integration
  const organizationId = 'org_placeholder'
  const userId = session.user.id

  return (
    <OnboardingLayout
      illustrationPanel={
        <OnboardingLeftPanel
          stepNumber={1}
          stepTitle="Let's set up your business"
          stepDescription="We'll ask you a few questions to customize IMARA for your unique business needs and get you started quickly."
        />
      }
    >
      {/* Mobile logo */}
      <div className="mb-8 lg:hidden">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-sm font-bold text-white">I</span>
          </div>
          <span className="text-lg font-semibold text-foreground">IMARA</span>
        </div>
      </div>

      <OnboardingContainer organizationId={organizationId} userId={userId} />
    </OnboardingLayout>
  )
}
