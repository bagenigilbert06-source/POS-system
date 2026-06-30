import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { AppNavbar } from '@/components/layout/app-navbar'
import { DynamicAppSidebar } from '@/components/layout/dynamic-app-sidebar'
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  // Get user's primary organization
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)

  if (!organization) {
    // User has no organization, redirect to onboarding
    redirect('/onboarding')
  }

  // If onboarding not completed, redirect back to onboarding
  if (!organization.onboardingCompleted) {
    redirect('/onboarding')
  }

  return (
    <DashboardLayoutClient
      userId={session.user.id}
      userName={session.user.name}
      userEmail={session.user.email}
      organizationId={organization.id}
      organizationName={organization.name}
    >
      {children}
    </DashboardLayoutClient>
  )
}
