import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import { WalletCards } from 'lucide-react';
import { FinancialAccountDialog } from '@/components/finance/finance-forms';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { hasPermission } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { branch, financialAccount } from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';

export default async function PaymentAccountsPage() {
  const context = await requireDashboardPermission(PermissionEnum.FINANCE_VIEW);
  const [accounts, branches] = await Promise.all([
    db
      .select({
        id: financialAccount.id,
        name: financialAccount.name,
        type: financialAccount.type,
        provider: financialAccount.provider,
        maskedIdentifier: financialAccount.maskedIdentifier,
        branchId: financialAccount.branchId,
        active: financialAccount.isActive,
        reconciliationEnabled: financialAccount.reconciliationEnabled,
        branchName: branch.name,
      })
      .from(financialAccount)
      .leftJoin(branch, eq(branch.id, financialAccount.branchId))
      .where(
        and(
          eq(financialAccount.organizationId, context.organizationId),
          context.isOrganizationWide
            ? undefined
            : or(
                isNull(financialAccount.branchId),
                inArray(financialAccount.branchId, context.branchIds)
              )
        )
      )
      .orderBy(asc(financialAccount.name)),
    db
      .select({ id: branch.id, name: branch.name })
      .from(branch)
      .where(
        and(
          eq(branch.organizationId, context.organizationId),
          context.isOrganizationWide
            ? undefined
            : inArray(branch.id, context.branchIds)
        )
      )
      .orderBy(asc(branch.name)),
  ]);
  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex items-start justify-between">
        <DashboardPageHeading
          icon={WalletCards}
          title="Payment Accounts"
          description="Configure cash, M-Pesa, card settlement, and bank accounts using safe masked identifiers."
        />
        {hasPermission(context, PermissionEnum.FINANCE_MANAGE) && (
          <FinancialAccountDialog branches={branches} />
        )}
      </div>
      <section className="rounded-lg border bg-card">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_100px] gap-3 border-b bg-muted/50 px-4 py-3 text-xs uppercase text-muted-foreground">
          <span>Account</span>
          <span>Type</span>
          <span>Provider</span>
          <span>Branch</span>
          <span>Status</span>
        </div>
        {accounts.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No payment accounts configured.
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="grid grid-cols-[1.4fr_1fr_1fr_1fr_100px] gap-3 border-b px-4 py-4 text-sm last:border-0"
            >
              <div>
                <p className="font-medium">{account.name}</p>
                <p className="text-xs text-muted-foreground">
                  {account.maskedIdentifier || 'No identifier stored'}
                </p>
              </div>
              <span>{account.type.replaceAll('_', ' ')}</span>
              <span>{account.provider || '—'}</span>
              <span>{account.branchName || 'All branches'}</span>
              <span
                className={
                  account.active ? 'text-emerald-700' : 'text-muted-foreground'
                }
              >
                {account.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
