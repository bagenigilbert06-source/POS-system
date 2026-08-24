import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { OrganizationService } from '@/lib/services/organization-service';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { db } from '@/lib/db';
import {
  branch,
  organization as organizationTable,
  user,
} from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getAuthorizationContext } from '@/lib/auth/authorization';
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth';
import { withDatabaseRetry } from '@/lib/db/retry';

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, posAuthorization] = await Promise.all([
    getCurrentSession(),
    getPosAuthorizationContext(),
  ]);
  if (!session?.user && !posAuthorization) redirect('/sign-in');
  const userId = posAuthorization?.userId ?? session!.user.id;

  const [accountRows, organization] = await Promise.all([
    withDatabaseRetry(() =>
      db
        .select({
          status: user.status,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)
    ),
    posAuthorization
      ? db
          .select()
          .from(organizationTable)
          .where(eq(organizationTable.id, posAuthorization.organizationId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : OrganizationService.getPrimaryOrganization(userId),
  ]);
  const account = accountRows[0];
  if (account?.status && account.status !== 'active') redirect('/restricted');

  if (!organization) {
    const ownedOrganization =
      await OrganizationService.getOwnedOrganization(userId);
    if (ownedOrganization) redirect('/workspace-recovery');
    redirect('/onboarding');
  }
  if (!organization.onboardingCompleted) redirect('/onboarding');

  // Build a full WorkspaceConfig from the persisted businessType + businessCategory.
  // This is done once on the server so the client never needs to fetch it separately.
  const [workspaceConfig, authorization] = await Promise.all([
    WorkspaceService.getAuthorizedWorkspaceConfig(organization),
    posAuthorization ?? getAuthorizationContext(),
  ]);
  const availableOrganizations = posAuthorization ? [organization] : await OrganizationService.getOrganizationsForUser(userId);
  if (!workspaceConfig) redirect('/onboarding');
  const [activeBranch] = await db
    .select({ name: branch.name })
    .from(branch)
    .where(
      and(
        eq(branch.organizationId, organization.id),
        authorization.isOrganizationWide
          ? eq(branch.isMain, true)
          : eq(branch.id, authorization.branchIds[0] ?? '')
      )
    )
    .orderBy(desc(branch.updatedAt))
    .limit(1);

  return (
    <DashboardLayoutClient
      userId={userId}
      userName={account?.name ?? session?.user.name ?? 'POS user'}
      userEmail={account?.email ?? session?.user.email ?? ''}
      userImage={account?.image ?? session?.user.image ?? null}
      organizationId={organization.id}
      organizationName={organization.name}
      availableOrganizations={availableOrganizations.map((item) => ({ id: item.id, name: item.name, businessType: item.businessType }))}
      branchName={activeBranch?.name ?? null}
      initialWorkspaceConfig={workspaceConfig}
      role={authorization.role}
      permissions={authorization.permissions}
    >
      {children}
    </DashboardLayoutClient>
  );
}
