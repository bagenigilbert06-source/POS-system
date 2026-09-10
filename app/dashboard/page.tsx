import type { Metadata } from 'next';
import { DashboardHome } from '@/components/dashboard/overview/dashboard-home';
import { redirect } from 'next/navigation';
import { getDefaultWorkspaceRoute } from '@/lib/auth/authorization';
import { getDashboardAuthorization } from '@/lib/auth/dashboard-access';
import { EmailVerificationNotice } from '@/components/auth/email-verification-notice';
import { CashierHome } from '@/components/dashboard/cashier-home';
import { db } from '@/lib/db';
import {
  branch,
  branchMembership,
  staffAttendance,
  user,
} from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getCurrentSession } from '@/lib/auth';
import { RoleEnum } from '@/lib/types/permissions';

// This overview is operational data; a browser refresh must render a fresh
// server snapshot rather than a previously cached route payload.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Business overview | Pesaby',
  description:
    'Review the operational records available in your Pesaby workspace.',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ verified?: string; error?: string }>;
}) {
  const authorization = await getDashboardAuthorization();
  const destination = getDefaultWorkspaceRoute(authorization);
  if (destination !== '/dashboard') redirect(destination);
  const query = await searchParams;
  if (authorization.role === RoleEnum.CASHIER) {
    const session = await getCurrentSession();
    const [[attendance], [assignedBranch], [account]] = await Promise.all([
      db
        .select({ clockInAt: staffAttendance.clockInAt })
        .from(staffAttendance)
        .where(
          and(
            eq(staffAttendance.organizationId, authorization.organizationId),
            eq(staffAttendance.userId, authorization.userId),
            isNull(staffAttendance.clockOutAt)
          )
        )
        .limit(1),
      db
        .select({ name: branch.name })
        .from(branchMembership)
        .innerJoin(branch, eq(branch.id, branchMembership.branchId))
        .where(
          and(
            eq(branchMembership.userId, authorization.userId),
            eq(branch.organizationId, authorization.organizationId)
          )
        )
        .limit(1),
      db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, authorization.userId))
        .limit(1),
    ]);
    return (
      <CashierHome
        name={session?.user.name ?? account?.name ?? 'Cashier'}
        branchName={assignedBranch?.name ?? 'Assigned branch'}
        activeClockIn={attendance?.clockInAt.toISOString() ?? null}
      />
    );
  }
  return (
    <>
      {query?.verified === '1' && (
        <EmailVerificationNotice error={query.error} />
      )}
      <DashboardHome />
    </>
  );
}
