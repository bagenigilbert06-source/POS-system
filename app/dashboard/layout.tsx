import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { OrganizationService } from '@/lib/services/organization-service';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { DashboardLayoutClient } from '@/components/layout/dashboard-layout-client';
import { db } from '@/lib/db';
import {
  branch,
  businessSettings,
  organization as organizationTable,
  user,
} from '@/lib/db/schema';
import { and, count, desc, eq } from 'drizzle-orm';
import { getDashboardAuthorization } from '@/lib/auth/dashboard-access';
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth';
import { withDatabaseRetry } from '@/lib/db/retry';
import { cleanBusinessDisplayName } from '@/lib/business/display-name';

export default async function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, posAuthorization] = await Promise.all([
    getCurrentSession(),
    getPosAuthorizationContext(),
  ]);
  // A browser may retain a POS PIN cookie from a different store. A current
  // dashboard sign-in is authoritative and must not be shadowed by it.
  const terminalAuthorization = session?.user ? null : posAuthorization;
  if (!session?.user && !terminalAuthorization) redirect('/sign-in');
  const userId = terminalAuthorization?.userId ?? session!.user.id;

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
    terminalAuthorization
      ? db
          .select()
          .from(organizationTable)
          .where(eq(organizationTable.id, terminalAuthorization.organizationId))
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
    terminalAuthorization ?? getDashboardAuthorization(),
  ]);
  if (!workspaceConfig) redirect('/onboarding');
  const [availableOrganizations, activeBranchRows, branchCountRows, brandingRows] = await Promise.all([
    terminalAuthorization
      ? Promise.resolve([organization])
      : OrganizationService.getOrganizationsForUser(userId),
    db
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
      .limit(1),
    db
      .select({ count: count() })
      .from(branch)
      .where(eq(branch.organizationId, organization.id)),
    db
      .select({
        displayName: businessSettings.displayName,
        receiptBusinessName: businessSettings.receiptBusinessName,
      })
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, organization.id))
      .limit(1),
  ]);
  const activeBranch = activeBranchRows[0];
  const displayName = cleanBusinessDisplayName(
    brandingRows[0]?.receiptBusinessName || brandingRows[0]?.displayName,
    organization.name
  );

  return (
    <DashboardLayoutClient
      userId={userId}
      userName={account?.name ?? session?.user.name ?? 'POS user'}
      userEmail={account?.email ?? session?.user.email ?? ''}
      userImage={account?.image ?? session?.user.image ?? null}
      organizationId={organization.id}
      organizationName={displayName}
      availableOrganizations={availableOrganizations.map((item) => ({ id: item.id, name: item.name, businessType: item.businessType }))}
      branchName={activeBranch?.name ?? null}
      branchCount={Number(branchCountRows[0]?.count ?? 0)}
      initialWorkspaceConfig={workspaceConfig}
      role={authorization.role}
      permissions={authorization.permissions}
    >
      {children}
    </DashboardLayoutClient>
  );
}
