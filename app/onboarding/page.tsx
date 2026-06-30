import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { OnboardingContainer } from '@/components/onboarding/onboarding-container'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import type { OnboardingData } from '@/components/onboarding/onboarding-container'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Setup Your Business' }

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  // Get user's primary organization, creating one on the fly if needed
  let organization = await OrganizationService.getPrimaryOrganization(session.user.id)

  if (!organization) {
    organization = await OrganizationService.createOrganizationForUser(
      session.user.id,
      session.user.name || `${session.user.email.split('@')[0]}'s Business`,
      'retail',
      'other_retail'
    )
  }

  // Already finished onboarding — send straight to the app
  if (organization.onboardingCompleted) {
    redirect('/dashboard')
  }

  /**
   * Resume support: onboardingStep is the index of the *next* step to show
   * (it is advanced by save-step after each completed step).
   * Clamp to [0, 4] — there are 5 wizard steps (0–4).
   */
  const resumeStep = Math.min(Math.max(0, (organization.onboardingStep ?? 1) - 1), 4)

  // Pre-fill any data that was already saved to the DB
  const prefilled: Partial<OnboardingData> = {
    businessType: organization.businessType ?? '',
    businessCategory: organization.businessCategory ?? '',
    businessName: organization.name ?? '',
    businessEmail: organization.businessEmail ?? '',
    phone: organization.phone ?? '',
    country: organization.country ?? '',
    timezone: organization.timezone ?? 'Africa/Nairobi',
    businessSize: organization.businessSize ?? '',
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

      <OnboardingContainer
        organizationId={organization.id}
        userId={session.user.id}
        initialStep={resumeStep}
        initialData={prefilled}
      />
    </OnboardingLayout>
  )
}
