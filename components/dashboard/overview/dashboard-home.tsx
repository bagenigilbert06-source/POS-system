import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { getDashboardOverview } from '@/lib/services/dashboard-overview-service'
import { BusinessOverview } from './business-overview'
import { getAuthorizationContext } from '@/lib/auth/authorization'
import { RoleEnum } from '@/lib/types/permissions'

export async function DashboardHome() {
  const session = await getCurrentSession()
  if (!session?.user) redirect('/sign-in')

  const authorization = await getAuthorizationContext()
  const organization = await OrganizationService.getOrganization(authorization.organizationId, session.user.id)
  if (!organization) redirect('/onboarding')

  const [workspaceConfig, overview] = await Promise.all([
    WorkspaceService.getWorkspaceConfig(organization.id, session.user.id),
    getDashboardOverview(
      organization.id,
      organization.timezone || 'Africa/Nairobi',
      authorization.role === RoleEnum.MANAGER ? authorization.branchIds : undefined,
    ),
  ])
  if (!workspaceConfig) redirect('/onboarding')

  return (
    <BusinessOverview
      organizationName={organization.name}
      userName={session.user.name}
      timeZone={organization.timezone || 'Africa/Nairobi'}
      currency={organization.currency || 'KES'}
      overview={overview}
      workspaceConfig={workspaceConfig}
      generatedAt={new Date()}
      role={authorization.role}
      permissions={authorization.permissions}
    />
  )
}
