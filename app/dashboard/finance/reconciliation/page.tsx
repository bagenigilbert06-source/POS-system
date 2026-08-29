import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { RefreshCcw } from 'lucide-react';
import {
  ReconcileDialog,
  StatementImportDialog,
} from '@/components/finance/finance-forms';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { hasPermission } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import {
  externalFinancialTransaction,
  financialAccount,
  invoice,
  invoicePayment,
  reconciliationMatch,
  sale,
  salePayment,
} from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';

const cash = (value: string | number) =>
  `KES ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
export default async function ReconciliationPage() {
  const context = await requireDashboardPermission(PermissionEnum.FINANCE_VIEW);
  const accountScope = context.isOrganizationWide
    ? undefined
    : or(
        isNull(financialAccount.branchId),
        inArray(financialAccount.branchId, context.branchIds)
      );
  const accounts = await db
    .select({ id: financialAccount.id, name: financialAccount.name })
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.organizationId, context.organizationId),
        eq(financialAccount.isActive, true),
        eq(financialAccount.reconciliationEnabled, true),
        accountScope
      )
    );
  const accountIds = accounts.map((account) => account.id);
  const [transactions, saleCandidates, invoiceCandidates, summary] =
    await Promise.all([
      accountIds.length
        ? db
            .select({
              id: externalFinancialTransaction.id,
              accountName: financialAccount.name,
              externalId: externalFinancialTransaction.externalId,
              transactionAt: externalFinancialTransaction.transactionAt,
              amount: externalFinancialTransaction.amount,
              feeAmount: externalFinancialTransaction.feeAmount,
              direction: externalFinancialTransaction.direction,
              reference: externalFinancialTransaction.reference,
              description: externalFinancialTransaction.description,
              status: externalFinancialTransaction.status,
              ignoredReason: externalFinancialTransaction.ignoredReason,
              difference: reconciliationMatch.difference,
            })
            .from(externalFinancialTransaction)
            .innerJoin(
              financialAccount,
              eq(
                financialAccount.id,
                externalFinancialTransaction.financialAccountId
              )
            )
            .leftJoin(
              reconciliationMatch,
              eq(
                reconciliationMatch.externalTransactionId,
                externalFinancialTransaction.id
              )
            )
            .where(
              and(
                eq(
                  externalFinancialTransaction.organizationId,
                  context.organizationId
                ),
                inArray(
                  externalFinancialTransaction.financialAccountId,
                  accountIds
                )
              )
            )
            .orderBy(desc(externalFinancialTransaction.transactionAt))
            .limit(300)
        : [],
      db
        .select({
          id: salePayment.id,
          amount: salePayment.amount,
          receipt: sale.receiptNo,
          method: salePayment.method,
          reference: salePayment.reference,
        })
        .from(salePayment)
        .innerJoin(sale, eq(sale.id, salePayment.saleId))
        .where(
          and(
            eq(salePayment.orgId, context.organizationId),
            context.isOrganizationWide
              ? undefined
              : inArray(sale.branchId, context.branchIds)
          )
        )
        .orderBy(desc(salePayment.createdAt))
        .limit(300),
      db
        .select({
          id: invoicePayment.id,
          amount: invoicePayment.amount,
          invoiceNo: invoice.invoiceNo,
          method: invoicePayment.method,
          reference: invoicePayment.reference,
        })
        .from(invoicePayment)
        .innerJoin(invoice, eq(invoice.id, invoicePayment.invoiceId))
        .where(
          and(
            eq(invoicePayment.organizationId, context.organizationId),
            context.isOrganizationWide
              ? undefined
              : inArray(invoicePayment.branchId, context.branchIds)
          )
        )
        .orderBy(desc(invoicePayment.createdAt))
        .limit(300),
      accountIds.length
        ? db
            .select({
              unmatched: sql<number>`count(*) filter (where ${externalFinancialTransaction.status} = 'unmatched')`,
              matched: sql<number>`count(*) filter (where ${externalFinancialTransaction.status} = 'matched')`,
              differences: sql<number>`count(*) filter (where ${externalFinancialTransaction.status} = 'difference')`,
            })
            .from(externalFinancialTransaction)
            .where(
              and(
                eq(
                  externalFinancialTransaction.organizationId,
                  context.organizationId
                ),
                inArray(
                  externalFinancialTransaction.financialAccountId,
                  accountIds
                )
              )
            )
        : [{ unmatched: 0, matched: 0, differences: 0 }],
    ]);
  const candidates = [
    ...saleCandidates.map((item) => ({
      id: item.id,
      type: 'sale_payment' as const,
      amount: item.amount,
      label: `${item.receipt} · ${item.method}${item.reference ? ` · ${item.reference}` : ''}`,
    })),
    ...invoiceCandidates.map((item) => ({
      id: item.id,
      type: 'invoice_payment' as const,
      amount: item.amount,
      label: `${item.invoiceNo} · ${item.method}${item.reference ? ` · ${item.reference}` : ''}`,
    })),
  ];
  const canManage = hasPermission(context, PermissionEnum.FINANCE_MANAGE);
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <DashboardPageHeading
          icon={RefreshCcw}
          title="Payments & Reconciliation"
          description="Compare Pesaby payments with provider and bank statement transactions."
        />
        {canManage && accounts.length > 0 && (
          <StatementImportDialog accounts={accounts} />
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Unmatched', summary[0]?.unmatched ?? 0],
          ['Matched', summary[0]?.matched ?? 0],
          ['Differences', summary[0]?.differences ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      {accounts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="font-medium">Add a payment account first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Statements are imported against a specific M-Pesa, bank, or card
            settlement account.
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border bg-card">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No statement transactions imported.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Account / reference</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Direction</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Fee</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.accountName}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {item.reference || item.externalId}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {item.transactionAt.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 capitalize">{item.direction}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {cash(item.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {cash(item.feeAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === 'matched' ? 'bg-emerald-100 text-emerald-700' : item.status === 'difference' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}
                        >
                          {item.status}
                        </span>
                        {item.difference && Number(item.difference) !== 0 && (
                          <p className="mt-1 text-xs text-red-600">
                            Difference {cash(item.difference)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && item.status === 'unmatched' && (
                          <ReconcileDialog
                            transaction={item}
                            candidates={candidates}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
