import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)

  if (!organization) redirect('/onboarding')
  if (!organization.onboardingCompleted) redirect('/onboarding')

  // Build a full WorkspaceConfig from the persisted businessType + businessCategory.
  // This is done once on the server so the client never needs to fetch it separately.
  const workspaceConfig = WorkspaceService.createWorkspaceConfig(
    organization.id,
    organization.businessType ?? 'retail',
    organization.businessCategory ?? 'other_retail'
  )

  return (
    <DashboardLayoutClient
      userId={session.user.id}
      userName={session.user.name}
      userEmail={session.user.email}
      organizationId={organization.id}
      organizationName={organization.name}
      initialWorkspaceConfig={workspaceConfig}
    >
      {children}
    </DashboardLayoutClient>
  )
}
