import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'

export async function requireWorkspaceModule(moduleId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization?.onboardingCompleted) redirect('/onboarding')
  const config = await WorkspaceService.getWorkspaceConfig(organization.id, session.user.id)
  if (!config?.enabledModules.includes(moduleId)) redirect('/dashboard')
}
