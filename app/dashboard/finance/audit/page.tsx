import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { ShieldCheck } from 'lucide-react';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { db } from '@/lib/db';
import { auditEvent, user } from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';

const prefixes = [
  'invoice.',
  'financial_account.',
  'reconciliation.',
  'finance_approval.',
  'credit_',
  'refund',
];
export default async function FinanceAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string }>;
}) {
  const context = await requireDashboardPermission(
    PermissionEnum.AUDIT_LOG_VIEW
  );
  const params = await searchParams;
  const financeActions = or(
    ...prefixes.map((prefix) => ilike(auditEvent.action, `${prefix}%`))
  );
  const rows = await db
    .select({
      id: auditEvent.id,
      action: auditEvent.action,
      metadata: auditEvent.metadata,
      createdAt: auditEvent.createdAt,
      actor: user.name,
    })
    .from(auditEvent)
    .innerJoin(user, eq(user.id, auditEvent.userId))
    .where(
      and(
      eq(auditEvent.organizationId, context.organizationId),
      context.isOrganizationWide
        ? undefined
        : inArray(sql<string>`${auditEvent.metadata}->>'branchId'`, context.branchIds),
        financeActions,
        params.action
          ? ilike(auditEvent.action, `%${params.action}%`)
          : undefined,
        params.q
          ? sql`${auditEvent.metadata}::text ilike ${`%${params.q}%`}`
          : undefined
      )
    )
    .orderBy(desc(auditEvent.createdAt))
    .limit(500);
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <DashboardPageHeading
        icon={ShieldCheck}
        title="Finance Audit"
        description="Immutable review history for sensitive finance operations."
      />
      <form className="flex gap-3 rounded-lg border bg-card p-4">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Entity, reference, amount…"
          className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <input
          name="action"
          defaultValue={params.action}
          placeholder="Action type"
          className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
        />
        <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Filter
        </button>
      </form>
      <section className="overflow-hidden rounded-lg border bg-card">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No matching finance audit events.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid gap-2 px-5 py-4 md:grid-cols-[200px_180px_1fr]"
              >
                <div>
                  <p className="text-sm font-medium">
                    {row.action.replaceAll('.', ' · ')}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.actor}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.createdAt.toLocaleString()}
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted/40 p-2 text-xs">
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
