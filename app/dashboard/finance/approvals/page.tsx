import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { BadgeCheck } from 'lucide-react';
import {
  ApprovalDecision,
  ApprovalPolicyDialog,
} from '@/components/finance/finance-forms';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { hasPermission } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { financeApproval, financeApprovalPolicy, user } from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';

const cash = (value: string) =>
  `KES ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
export default async function ApprovalsPage() {
  const context = await requireDashboardPermission(PermissionEnum.FINANCE_VIEW);
  const canManage = hasPermission(context, PermissionEnum.FINANCE_MANAGE);
  const [requests, policies] = await Promise.all([
    db
      .select({
        id: financeApproval.id,
        actionType: financeApproval.actionType,
        entityType: financeApproval.entityType,
        entityId: financeApproval.entityId,
        amount: financeApproval.amount,
        reason: financeApproval.reason,
        status: financeApproval.status,
        requester: user.name,
        requestedBy: financeApproval.requestedBy,
        decisionReason: financeApproval.decisionReason,
        createdAt: financeApproval.createdAt,
      })
      .from(financeApproval)
      .innerJoin(user, eq(user.id, financeApproval.requestedBy))
      .where(and(eq(financeApproval.organizationId, context.organizationId), context.isOrganizationWide ? undefined : or(isNull(financeApproval.branchId), inArray(financeApproval.branchId, context.branchIds))))
      .orderBy(desc(financeApproval.createdAt))
      .limit(300),
    db
      .select()
      .from(financeApprovalPolicy)
      .where(eq(financeApprovalPolicy.organizationId, context.organizationId))
      .orderBy(financeApprovalPolicy.actionType),
  ]);
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <div className="flex items-start justify-between">
        <DashboardPageHeading
          icon={BadgeCheck}
          title="Approval Inbox"
          description="Review high-value finance actions with separation of duties and an immutable decision history."
        />
        {canManage && <ApprovalPolicyDialog />}
      </div>
      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Policies</h2>
        </div>
        {policies.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            No approval thresholds configured. Actions do not require this
            optional workflow until a policy is set.
          </p>
        ) : (
          <div className="divide-y">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="grid grid-cols-3 px-5 py-3 text-sm"
              >
                <span className="capitalize">
                  {policy.actionType.replaceAll('_', ' ')}
                </span>
                <span>{cash(policy.thresholdAmount)} and above</span>
                <span>
                  {policy.preventSelfApproval
                    ? 'No self-approval'
                    : 'Self-approval allowed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_220px] border-b bg-muted/50 px-4 py-3 text-xs uppercase text-muted-foreground">
          <span>Request</span>
          <span>Amount</span>
          <span>Requested by</span>
          <span>Status</span>
          <span />
        </div>
        {requests.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No finance approval requests.
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="grid grid-cols-[1.2fr_1fr_1fr_1fr_220px] items-center border-b px-4 py-4 text-sm last:border-0"
            >
              <div>
                <p className="font-medium capitalize">
                  {request.actionType.replaceAll('_', ' ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.entityType} · {request.entityId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.reason}
                </p>
              </div>
              <span>{cash(request.amount)}</span>
              <span>{request.requester}</span>
              <div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                  {request.status}
                </span>
                {request.decisionReason && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.decisionReason}
                  </p>
                )}
              </div>
              <div>
                {canManage && request.status === 'pending' && (
                  <ApprovalDecision id={request.id} />
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
