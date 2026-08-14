import type { Metadata } from 'next';
import { eq, sql } from 'drizzle-orm';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import {
  organizationMembership,
  posPinCredential,
  session,
  user,
} from '@/lib/db/schema';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import {
  canManageExistingRole,
  PermissionEnum,
  RoleEnum,
} from '@/lib/types/permissions';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { RevokeSessionsButton } from '@/components/admin/revoke-sessions-button';

export const metadata: Metadata = { title: 'Security administration | Pesaby' };

export default async function SecurityPage() {
  const authorization = await requireDashboardPermission(
    PermissionEnum.ADMIN_ACCESS
  );
  const members = await db
    .select({
      userId: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: organizationMembership.role,
      pinEnabled: posPinCredential.enabled,
      pinLockedUntil: posPinCredential.lockedUntil,
      activeSessions: sql<number>`(select count(*) from ${session} where ${session.userId} = ${user.id} and ${session.expiresAt} > now())`,
    })
    .from(organizationMembership)
    .innerJoin(user, eq(user.id, organizationMembership.userId))
    .leftJoin(posPinCredential, eq(posPinCredential.userId, user.id))
    .where(
      eq(organizationMembership.organizationId, authorization.organizationId)
    )
    .orderBy(organizationMembership.role, user.name);
  const activeSessions = members.reduce(
    (sum, member) => sum + Number(member.activeSessions),
    0
  );
  const lockedPins = members.filter(
    (member) => member.pinLockedUntil && member.pinLockedUntil > new Date()
  ).length;
  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Security"
        description="Review authentication posture and revoke sessions for accounts below your role."
      />
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric
          icon={ShieldCheck}
          label="Member accounts"
          value={members.length}
        />
        <Metric
          icon={KeyRound}
          label="Active sessions"
          value={activeSessions}
        />
        <Metric icon={LockKeyhole} label="Locked POS PINs" value={lockedPins} />
      </section>
      <section className="app-panel overflow-hidden">
        <div className="border-b p-5">
          <h2 className="font-bold">Account access</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Passwords are hashed, sessions expire after seven days, and PIN
            secrets are never shown.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Browser sessions</th>
                <th className="px-4 py-3 text-left">POS PIN</th>
                <th className="px-4 py-3 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member) => {
                const manageable =
                  member.userId !== authorization.userId &&
                  canManageExistingRole(
                    authorization.role,
                    member.role as RoleEnum
                  );
                const pinLocked = Boolean(
                  member.pinLockedUntil && member.pinLockedUntil > new Date()
                );
                return (
                  <tr key={member.userId}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 capitalize">{member.role}</td>
                    <td className="px-4 py-3 capitalize">{member.status}</td>
                    <td className="px-4 py-3">
                      {Number(member.activeSessions)}
                    </td>
                    <td className="px-4 py-3">
                      {pinLocked
                        ? 'Locked'
                        : member.pinEnabled
                          ? 'Enabled'
                          : 'Not set'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RevokeSessionsButton
                        userId={member.userId}
                        name={member.name}
                        disabled={
                          !manageable || Number(member.activeSessions) === 0
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: number;
}) {
  return (
    <article className="app-panel p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </article>
  );
}
