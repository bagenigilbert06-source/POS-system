import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { auditEvent, user } from '@/lib/db/schema';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';
import { AdminPageHeader } from '@/components/admin/admin-page-header';

export const metadata: Metadata = { title: 'Organization audit log | Pesaby' };

export default async function AuditPage() {
  const authorization = await requireDashboardPermission(
    PermissionEnum.ADMIN_ACCESS
  );
  const events = await db
    .select({
      id: auditEvent.id,
      action: auditEvent.action,
      metadata: auditEvent.metadata,
      createdAt: auditEvent.createdAt,
      actorName: user.name,
      actorEmail: user.email,
    })
    .from(auditEvent)
    .leftJoin(user, eq(user.id, auditEvent.userId))
    .where(eq(auditEvent.organizationId, authorization.organizationId))
    .orderBy(desc(auditEvent.createdAt))
    .limit(200);
  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Audit activity"
        description="Review persisted security, access, payment and operational activity across the organization."
      />
      <section className="app-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Activity</th>
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {event.createdAt.toLocaleString('en-KE')}
                  </td>
                  <td className="px-4 py-3 font-semibold capitalize">
                    {event.action.replace(/[._-]/g, ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{event.actorName || 'System'}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.actorEmail}
                    </p>
                  </td>
                  <td className="max-w-[420px] px-4 py-3 font-mono text-xs text-muted-foreground">
                    {summarize(event.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!events.length && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No audit events have been recorded.
          </p>
        )}
      </section>
    </div>
  );
}

function summarize(metadata: unknown) {
  const value = JSON.stringify(metadata ?? {});
  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}
