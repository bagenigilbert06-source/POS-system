import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { getDashboardOverview } from '@/lib/services/dashboard-overview-service'
import { BusinessOverview } from './business-overview'

export async function DashboardHome() {
  const session = await getCurrentSession()
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
      userName="Jordan Doe"
      timeZone={organization.timezone || 'Africa/Nairobi'}
      currency={organization.currency || 'KES'}
      overview={overview}
      workspaceConfig={workspaceConfig}
      generatedAt={new Date()}
    />
  )
}
