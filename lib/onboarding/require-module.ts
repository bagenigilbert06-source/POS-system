import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'

export async function requireWorkspaceModule(moduleId: string) {
  const pos = await getPosAuthorizationContext()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user && !pos) redirect('/sign-in')
  const userId = pos?.userId ?? session!.user.id
  const organization = pos
    ? await OrganizationService.getOrganization(pos.organizationId, userId)
    : await OrganizationService.getPrimaryOrganization(userId)
  if (!organization?.onboardingCompleted) redirect('/onboarding')
  const config = await WorkspaceService.getWorkspaceConfig(organization.id, userId)
  if (!config?.enabledModules.includes(moduleId)) redirect('/dashboard')
  return { organization, config }
}
