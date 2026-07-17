import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'
import { SetupChecklist } from '@/components/dashboard/setup-checklist'
import { getSetupChecklist } from '@/lib/services/setup-checklist-service'

export default async function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)

  if (!organization) redirect('/onboarding')
  if (!organization.onboardingCompleted) redirect('/onboarding')

  // Build a full WorkspaceConfig from the persisted businessType + businessCategory.
  // This is done once on the server so the client never needs to fetch it separately.
  const workspaceConfig = await WorkspaceService.getWorkspaceConfig(organization.id, session.user.id)
  if (!workspaceConfig) redirect('/onboarding')
  const checklist = await getSetupChecklist(organization.id, workspaceConfig.enabledModules)

  return (
    <DashboardLayoutClient
      userId={session.user.id}
      userName={session.user.name}
      userEmail={session.user.email}
      organizationId={organization.id}
      organizationName={organization.name}
      initialWorkspaceConfig={workspaceConfig}
      setupChecklist={<SetupChecklist items={checklist.items} initiallyDismissed={checklist.dismissed} />}
    >
      {children}
    </DashboardLayoutClient>
  )
}
