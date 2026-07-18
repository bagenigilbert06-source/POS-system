import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { getDashboardOverview } from '@/lib/services/dashboard-overview-service'
import { BusinessOverview } from './business-overview'

export async function DashboardHome() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const [workspaceConfig, overview] = await Promise.all([
    WorkspaceService.getWorkspaceConfig(organization.id, session.user.id),
    getDashboardOverview(organization.id, organization.timezone || 'Africa/Nairobi'),
  ])
  if (!workspaceConfig) redirect('/onboarding')

  return (
    <BusinessOverview
      organizationName={organization.name}
      userName={session.user.name}
      currency={organization.currency || 'KES'}
      overview={overview}
      workspaceConfig={workspaceConfig}
    />
  )
}
