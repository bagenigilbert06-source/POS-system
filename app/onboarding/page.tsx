import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { OnboardingContainer } from '@/components/onboarding/onboarding-container'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Setup Your Business' }

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  // Get user's primary organization
  let organization = await OrganizationService.getPrimaryOrganization(session.user.id)

  if (!organization) {
    // If no organization exists, create one now
    console.log('[v0] No organization found for user', session.user.id, '- creating now')
    organization = await OrganizationService.createOrganizationForUser(
      session.user.id,
      session.user.name || `${session.user.email.split('@')[0]}'s Business`,
      'retail',
      'other_retail'
    )
  }

  // If onboarding is already completed, redirect to dashboard
  if (organization.onboardingCompleted) {
    redirect('/dashboard')
  }

  return (
    <OnboardingLayout>
      {/* Logo */}
      <div className="mb-12">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">I</span>
          </div>
          <span className="text-lg font-semibold text-foreground">IMARA</span>
        </div>
      </div>

      <OnboardingContainer organizationId={organization.id} userId={session.user.id} />
    </OnboardingLayout>
  )
}
