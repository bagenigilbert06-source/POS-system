import { cache } from 'react'
import { redirect } from 'next/navigation'
import {
  AuthorizationError,
  getAuthorizationContext,
  type AuthorizationContext,
} from '@/lib/auth/authorization'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'

export const requireWorkspaceModule = cache(async (moduleId: string) => {
  const pos = await getPosAuthorizationContext()
  let authorization: AuthorizationContext | null = pos
  if (!authorization) {
    try {
      authorization = await getAuthorizationContext()
    } catch (error) {
      if (error instanceof AuthorizationError && error.message === 'Unauthorized') {
        redirect('/sign-in')
      }
      throw error
    }
  }
  if (!authorization) redirect('/sign-in')
  const organization = await OrganizationService.getOrganization(
    authorization.organizationId,
    authorization.userId,
  )
  if (!organization?.onboardingCompleted) redirect('/onboarding')
  const config = await WorkspaceService.getAuthorizedWorkspaceConfig(organization)
  if (!config.enabledModules.includes(moduleId)) redirect('/dashboard')
  return { organization, config, authorization }
})
