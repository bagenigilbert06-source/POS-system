import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceRecovery } from '@/components/workspace/workspace-recovery'

export default async function WorkspaceRecoveryPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const memberOrganization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (memberOrganization?.onboardingCompleted) redirect('/dashboard')
  const ownedOrganization = await OrganizationService.getOwnedOrganization(session.user.id)
  if (!ownedOrganization) redirect('/onboarding')
  return <WorkspaceRecovery organizationName={ownedOrganization.name} />
}
