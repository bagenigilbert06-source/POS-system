import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { WorkspaceService } from '@/lib/services/workspace-service'
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client'
import { SetupChecklist } from '@/components/dashboard/setup-checklist'
import { getSetupChecklist } from '@/lib/services/setup-checklist-service'
import { db } from '@/lib/db'
import { branch, user } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'

export default async function DashboardRouteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [account] = await db.select({ status: user.status }).from(user).where(eq(user.id, session.user.id)).limit(1)
  if (account?.status && account.status !== 'active') redirect('/restricted')

  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)

  if (!organization) {
    const ownedOrganization = await OrganizationService.getOwnedOrganization(session.user.id)
    if (ownedOrganization) redirect('/workspace-recovery')
    redirect('/onboarding')
  }
  if (!organization.onboardingCompleted) redirect('/onboarding')

  // Build a full WorkspaceConfig from the persisted businessType + businessCategory.
  // This is done once on the server so the client never needs to fetch it separately.
  const workspaceConfig = await WorkspaceService.getWorkspaceConfig(organization.id, session.user.id)
  if (!workspaceConfig) redirect('/onboarding')
  const [checklist, [activeBranch]] = await Promise.all([
    getSetupChecklist(organization.id, workspaceConfig.enabledModules),
    db.select({ name: branch.name }).from(branch)
      .where(and(eq(branch.organizationId, organization.id), eq(branch.isMain, true)))
      .orderBy(desc(branch.updatedAt))
      .limit(1),
  ])

  return (
    <DashboardLayoutClient
      userId={session.user.id}
      userName={session.user.name}
      userEmail={session.user.email}
      organizationId={organization.id}
      organizationName={organization.name}
      branchName={activeBranch?.name ?? null}
      initialWorkspaceConfig={workspaceConfig}
      setupChecklist={<SetupChecklist key="setup-checklist" items={checklist.items} initiallyDismissed={checklist.dismissed} />}
    >
      {children}
    </DashboardLayoutClient>
  )
}
