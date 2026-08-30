import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import Link from 'next/link';
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
  expense,
  invoice,
  invoicePayment,
  reconciliationMatch,
  sale,
  salePayment,
} from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';
import { money } from '@/lib/finance/money';
import { mpesaPaymentRequest } from '@/lib/db/schema';
import { PendingPaymentAction } from '@/app/dashboard/pos/mpesa-reconciliation/reconciliation-actions';

const cash = (value: string | number) =>
  `KES ${money(value).toNumber().toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default async function ReconciliationPage({ searchParams }: { searchParams: Promise<{ account?: string; period?: string; status?: string; channel?: string; from?: string; to?: string; page?: string }> }) {
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
        inArray(financialAccount.type, ['mpesa_till', 'mpesa_paybill', 'airtel_money', 'card_settlement', 'bank']),
        eq(financialAccount.isActive, true),
        eq(financialAccount.reconciliationEnabled, true),
        accountScope
      )
    );
  const accountIds = accounts.map((account) => account.id);
  const pendingMpesa = await db.select({ id: mpesaPaymentRequest.id, amount: mpesaPaymentRequest.amount, status: mpesaPaymentRequest.status, phone: mpesaPaymentRequest.phone }).from(mpesaPaymentRequest).where(and(eq(mpesaPaymentRequest.organizationId, context.organizationId), inArray(mpesaPaymentRequest.status, ['AWAITING_CONFIRMATION', 'RECONCILIATION_REQUIRED']))).limit(200);
  const params = await searchParams;
  const selectedAccount = params.account && accountIds.includes(params.account) ? params.account : undefined;
  const page = Number.isInteger(Number(params.page)) && Number(params.page) > 0 ? Number(params.page) : 1;
  const pageSize = 20;
  const period = ['today', 'yesterday', '7d', '30d'].includes(params.period ?? '') ? params.period : undefined;
  const channel = ['mpesa', 'airtel_money', 'card', 'bank_transfer'].includes(params.channel ?? '') ? params.channel : undefined;
  const paymentMethods = channel ? [channel] : ['mpesa', 'airtel_money', 'card', 'bank_transfer'];
  const from = period === 'today' ? new Date(new Date().setHours(0, 0, 0, 0)) : period === 'yesterday' ? new Date(new Date().setHours(0, 0, 0, 0) - 86400000) : period === '7d' ? new Date(new Date().getTime() - 7 * 86400000) : period === '30d' ? new Date(new Date().getTime() - 30 * 86400000) : period === 'custom' && params.from ? new Date(params.from) : undefined;
  const to = period === 'custom' && params.to ? new Date(`${params.to}T23:59:59`) : undefined;
  const providerScope = and(
    eq(externalFinancialTransaction.organizationId, context.organizationId),
    inArray(externalFinancialTransaction.financialAccountId, selectedAccount ? [selectedAccount] : accountIds),
    from ? sql`${externalFinancialTransaction.transactionAt} >= ${from}` : undefined,
    to ? sql`${externalFinancialTransaction.transactionAt} <= ${to}` : undefined
  );
  const providerStatus = params.status === 'needs_review' ? 'difference' : params.status;
  const transactionScope = and(providerScope, providerStatus === 'awaiting_statement' ? sql`false` : providerStatus && ['unmatched', 'matched', 'difference', 'ignored'].includes(providerStatus) ? eq(externalFinancialTransaction.status, providerStatus) : undefined);
  const paymentSaleScope = and(eq(salePayment.orgId, context.organizationId), inArray(salePayment.method, paymentMethods), context.isOrganizationWide ? undefined : inArray(sale.branchId, context.branchIds), from ? sql`${salePayment.createdAt} >= ${from}` : undefined, to ? sql`${salePayment.createdAt} <= ${to}` : undefined);
  const paymentInvoiceScope = and(eq(invoicePayment.organizationId, context.organizationId), inArray(invoicePayment.method, paymentMethods), context.isOrganizationWide ? undefined : inArray(invoicePayment.branchId, context.branchIds), from ? sql`${invoicePayment.createdAt} >= ${from}` : undefined, to ? sql`${invoicePayment.createdAt} <= ${to}` : undefined);
  const [transactions, saleCandidates, expenseCandidates, invoiceCandidates, summary, paymentSummary, providerSummary] =
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
              systemType: reconciliationMatch.systemType,
              systemId: reconciliationMatch.systemId,
              systemAmount: reconciliationMatch.systemAmount,
              externalAmount: reconciliationMatch.externalAmount,
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
              transactionScope
            )
            .orderBy(desc(externalFinancialTransaction.transactionAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize)
        : [],
      db
        .select({
          id: salePayment.id,
          amount: salePayment.amount,
          receipt: sale.receiptNo,
          method: salePayment.method,
          reference: salePayment.reference,
          createdAt: salePayment.createdAt,
        })
        .from(salePayment)
        .innerJoin(sale, eq(sale.id, salePayment.saleId))
        .where(
          and(
            paymentSaleScope
          )
        )
        .orderBy(desc(salePayment.createdAt))
        .limit(300),
      db.select({ id: expense.id, amount: expense.amount, expenseNo: expense.expenseNo, title: expense.title, reference: expense.reference, createdAt: expense.createdAt })
        .from(expense)
        .where(and(eq(expense.orgId, context.organizationId), eq(expense.status, 'effective'), inArray(expense.financialAccountId, selectedAccount ? [selectedAccount] : accountIds)))
        .orderBy(desc(expense.createdAt)).limit(300),
      db
        .select({
          id: invoicePayment.id,
          amount: invoicePayment.amount,
          invoiceNo: invoice.invoiceNo,
          method: invoicePayment.method,
          reference: invoicePayment.reference,
          createdAt: invoicePayment.createdAt,
        })
        .from(invoicePayment)
        .innerJoin(invoice, eq(invoice.id, invoicePayment.invoiceId))
        .where(
          and(
            paymentInvoiceScope
          )
        )
        .orderBy(desc(invoicePayment.createdAt))
        .limit(300),
      accountIds.length
        ? db
            .select({
              unmatched: sql<number>`count(*) filter (where ${externalFinancialTransaction.status} = 'unmatched')`,
              unmatchedValue: sql<string>`coalesce(sum(${externalFinancialTransaction.amount}) filter (where ${externalFinancialTransaction.status} = 'unmatched'), 0)`,
              matched: sql<number>`count(*) filter (where ${externalFinancialTransaction.status} = 'matched')`,
              matchedValue: sql<string>`coalesce(sum(${externalFinancialTransaction.amount}) filter (where ${externalFinancialTransaction.status} = 'matched'), 0)`,
              differences: sql<number>`count(*) filter (where ${externalFinancialTransaction.status} = 'difference')`,
              differencesValue: sql<string>`coalesce(sum(abs(${externalFinancialTransaction.amount})) filter (where ${externalFinancialTransaction.status} = 'difference'), 0)`,
              total: sql<number>`count(*)`,
            })
            .from(externalFinancialTransaction)
            .where(
              transactionScope
            )
        : [{ unmatched: 0, unmatchedValue: '0', matched: 0, matchedValue: '0', differences: 0, differencesValue: '0', total: 0 }],
      Promise.all([
        db.select({ count: sql<number>`count(*)`, value: sql<string>`coalesce(sum(${salePayment.amount}), 0)` }).from(salePayment).innerJoin(sale, eq(sale.id, salePayment.saleId)).where(paymentSaleScope),
        db.select({ count: sql<number>`count(*)`, value: sql<string>`coalesce(sum(${invoicePayment.amount}), 0)` }).from(invoicePayment).where(paymentInvoiceScope),
      ]),
      accountIds.length
        ? db.select({ count: sql<number>`count(*)`, value: sql<string>`coalesce(sum(${externalFinancialTransaction.amount}), 0)` }).from(externalFinancialTransaction).where(providerScope)
        : [{ count: 0, value: '0' }],
    ]);
  const candidates = [
    ...saleCandidates.map((item) => ({
      id: item.id,
      type: 'sale_payment' as const,
      amount: item.amount,
      method: item.method,
      reference: item.reference,
      createdAt: item.createdAt,
      documentLabel: `Receipt ${item.receipt}`,
      label: `Receipt ${item.receipt}`,
    })),
    ...invoiceCandidates.map((item) => ({
      id: item.id,
      type: 'invoice_payment' as const,
      amount: item.amount,
      method: item.method,
      reference: item.reference,
      createdAt: item.createdAt,
      documentLabel: `Invoice ${item.invoiceNo}`,
      label: `Invoice ${item.invoiceNo}`,
    })),
    ...expenseCandidates.map((item) => ({ id: item.id, type: 'expense' as const, amount: item.amount, method: 'expense', reference: item.reference, createdAt: item.createdAt, documentLabel: `Expense ${item.expenseNo}`, label: `Expense ${item.expenseNo} — ${item.title}` })),
  ];
  const canManage = hasPermission(context, PermissionEnum.FINANCE_MANAGE);
  const electronicCandidates = candidates.filter((candidate) => ['mpesa', 'card', 'airtel_money', 'bank_transfer'].includes(candidate.method));
  const recordedCount = Number(paymentSummary[0][0]?.count ?? 0) + Number(paymentSummary[1][0]?.count ?? 0);
  const recordedValue = money(paymentSummary[0][0]?.value ?? 0).plus(paymentSummary[1][0]?.value ?? 0).toString();
  const providerCount = Number(providerSummary[0]?.count ?? 0);
  const providerValue = providerSummary[0]?.value ?? 0;
  const matchedCount = Number(summary[0]?.matched ?? 0);
  const matchedValue = summary[0]?.matchedValue ?? 0;
  const awaitingCount = Math.max(recordedCount - matchedCount, 0);
  const awaitingValue = money(recordedValue).minus(matchedValue).greaterThan(0) ? money(recordedValue).minus(matchedValue).toString() : '0';
  const channelLabel = (value: string) => ({ mpesa: 'M-Pesa', airtel_money: 'Airtel Money', card: 'Card', bank_transfer: 'Bank' }[value] ?? value);
  const statusLabel = (value: string) => ({ unmatched: 'Unmatched', matched: 'Matched', difference: 'Difference', ignored: 'Ignored' }[value] ?? value);
  const total = Number(summary[0]?.total ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const query = new URLSearchParams();
  if (selectedAccount) query.set('account', selectedAccount);
  if (period) query.set('period', period);
  if (period === 'custom' && params.from) query.set('from', params.from);
  if (period === 'custom' && params.to) query.set('to', params.to);
  if (params.status) query.set('status', params.status);
  if (channel) query.set('channel', channel);
  const pageHref = (value: number) => {
    const next = new URLSearchParams(query);
    next.set('page', String(value));
    return `?${next.toString()}`;
  };
  const candidateByMatch = new Map(candidates.map((candidate) => [`${candidate.type}:${candidate.id}`, candidate]));
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <DashboardPageHeading
          theme="adaptive"
          icon={RefreshCcw}
          title="Payments & Reconciliation"
          description="Compare Pesaby payments with provider and bank statement transactions."
        />
        {canManage && accounts.length > 0 && (
          <StatementImportDialog accounts={accounts} />
        )}
      </div>
      {pendingMpesa.length > 0 && <section className="rounded-xl border border-amber-200 bg-card shadow-sm dark:border-amber-900"><div className="flex items-center justify-between border-b px-5 py-3"><div><h2 className="font-semibold">Pending M-Pesa payments</h2><p className="text-xs text-muted-foreground">Resolve these before closing the POS shift.</p></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">{pendingMpesa.length} pending</span></div><div className="grid gap-3 p-4 md:grid-cols-2">{pendingMpesa.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.id.slice(0, 12)} <span className="font-normal text-muted-foreground">· {cash(item.amount)}</span></p><p className="mt-0.5 text-xs text-muted-foreground">{item.status.replaceAll('_', ' ')}{item.phone ? ` · ${item.phone}` : ''}</p></div><PendingPaymentAction requestId={item.id} /></div>)}</div></section>}
      {accounts.length > 0 && <form className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-medium">Channel
          <select name="channel" defaultValue={channel ?? ''} className="block h-9 w-full rounded-md border bg-background px-3 text-sm font-normal">
            <option value="">All electronic payments</option><option value="mpesa">M-Pesa</option><option value="airtel_money">Airtel Money</option><option value="card">Card</option><option value="bank_transfer">Bank</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">Payment account
          <select name="account" defaultValue={selectedAccount ?? ''} className="block h-9 w-full rounded-md border bg-background px-3 text-sm font-normal">
            <option value="">All payment accounts</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium">Period
          <select name="period" defaultValue={period ?? ''} className="block h-9 w-full rounded-md border bg-background px-3 text-sm font-normal">
            <option value="">All dates</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom</option>
          </select>
          {period === 'custom' && <div className="mt-2 grid grid-cols-2 gap-2"><input type="date" name="from" defaultValue={params.from} className="h-9 rounded-md border bg-background px-2 text-sm font-normal" aria-label="From date" /><input type="date" name="to" defaultValue={params.to} className="h-9 rounded-md border bg-background px-2 text-sm font-normal" aria-label="To date" /></div>}
        </label>
        <label className="space-y-1 text-xs font-medium">Status
          <select name="status" defaultValue={params.status ?? ''} className="block h-9 w-full rounded-md border bg-background px-3 text-sm font-normal">
            <option value="">All statuses</option><option value="awaiting_statement">Awaiting statement</option><option value="matched">Matched</option><option value="unmatched">Unmatched</option><option value="difference">Difference</option><option value="needs_review">Needs review</option><option value="ignored">Ignored</option>
          </select>
        </label>
        <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground sm:col-span-3">Apply filters</button>
      </form>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Pesaby recorded', recordedCount, recordedValue],
          ['Provider imported', providerCount, providerValue],
          ['Awaiting statement', awaitingCount, awaitingValue],
          ['Matched', matchedCount, matchedValue],
          ['Needs review', summary[0]?.differences ?? 0, summary[0]?.differencesValue ?? 0],
        ].map(([label, value, amount]) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value} transactions</p>
            <p className="mt-1 text-sm text-muted-foreground">{cash(amount as string)}</p>
          </div>
        ))}
      </div>
      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Pesaby payments</h2>
            <p className="mt-1 text-xs text-muted-foreground">Electronic payments are recorded here before the provider statement arrives. Cash stays in POS shifts.</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{recordedCount} recorded · {cash(recordedValue)}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {[['', 'All electronic payments'], ['mpesa', 'M-Pesa'], ['airtel_money', 'Airtel Money'], ['card', 'Card'], ['bank_transfer', 'Bank']].map(([value, label]) => {
            const next = new URLSearchParams();
            if (period) next.set('period', period);
            if (value) next.set('channel', value);
            return <Link key={value} href={`?${next.toString()}`} className={`rounded-full border px-3 py-1.5 ${channel === value || (!channel && !value) ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{label}</Link>;
          })}
        </div>
      </section>
      {electronicCandidates.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Pesaby payments available to match</h2>
              <p className="mt-1 text-xs text-muted-foreground">These are recorded M-Pesa, card, Airtel Money, and invoice payments. Import a provider statement to reconcile them.</p>
            </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{electronicCandidates.length} records</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {electronicCandidates.slice(0, 6).map((candidate) => (
              <div key={`${candidate.type}-${candidate.id}`} className="rounded-md border bg-background/50 px-3 py-2 text-sm">
                <p className="font-medium">{channelLabel(candidate.method)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{candidate.label}</p>
                <p className="mt-1 text-lg font-semibold">{cash(candidate.amount)}</p>
                {candidate.reference && <p className="truncate text-xs text-muted-foreground">Ref: {candidate.reference}</p>}
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-amber-700"><span>{candidate.method === 'card' ? 'Awaiting settlement' : 'Awaiting statement'}</span><span>{candidate.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {candidate.createdAt.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' })}</span></div>
              </div>
            ))}
          </div>
        </section>
      )}
      {accounts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="font-medium">No payment account configured</p>
          <p className="mt-1 text-sm text-muted-foreground">Pesaby has recorded {recordedCount} electronic payments worth {cash(recordedValue)}. Add an account to reconcile them against provider statements.</p>
          <Link href="/dashboard/finance/accounts" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">+ Add Payment Account</Link>
        </div>
      ) : (
        <section className="overflow-hidden rounded-lg border bg-card">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-medium">No provider transactions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">{awaitingCount} Pesaby payment{awaitingCount === 1 ? '' : 's'} worth {cash(awaitingValue)} are waiting for provider data. Use “Import statement” above to continue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Channel</th>
                    <th className="px-4 py-3 text-left">Pesaby transaction</th>
                    <th className="px-4 py-3 text-left">Provider transaction</th>
                    <th className="px-4 py-3 text-right">Pesaby amount</th>
                    <th className="px-4 py-3 text-right">Provider amount</th>
                    <th className="px-4 py-3 text-right">Difference</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-right">Fee</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((item) => (
                    <tr key={item.id} className="border-t">
                      {(() => {
                        const matched = item.systemType && item.systemId ? candidateByMatch.get(`${item.systemType}:${item.systemId}`) : undefined;
                        return <>
                          <td className="px-4 py-3">{matched ? channelLabel(matched.method) : item.accountName}</td>
                          <td className="px-4 py-3">{matched ? <><p className="font-medium">{matched.label}</p>{matched.reference && <p className="text-xs text-muted-foreground">Ref: {matched.reference}</p>}</> : <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-4 py-3"><p className="font-medium">{item.reference || item.externalId}</p><p className="text-xs text-muted-foreground">{item.accountName}</p></td>
                        </>;
                      })()}
                      <td className="px-4 py-3 text-right font-medium">{item.systemAmount ? cash(item.systemAmount) : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{cash(item.amount)}</td>
                      <td className="px-4 py-3 text-right">{item.difference ? cash(item.difference) : '—'}</td>
                      <td className="px-4 py-3">{item.transactionAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {item.transactionAt.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 text-right">
                        {cash(item.feeAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === 'matched' ? 'bg-emerald-100 text-emerald-700' : item.status === 'difference' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}
                        >
                          {statusLabel(item.status)}
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
      {accounts.length > 0 && total > 0 && <nav className="flex items-center justify-between text-sm text-muted-foreground" aria-label="Reconciliation pagination">
        <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
        <div className="flex items-center gap-2"><Link aria-disabled={page <= 1} className={`rounded-md border px-3 py-2 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`} href={pageHref(Math.max(1, page - 1))}>Previous</Link><span>Page {page} of {pageCount}</span><Link aria-disabled={page >= pageCount} className={`rounded-md border px-3 py-2 ${page >= pageCount ? 'pointer-events-none opacity-40' : ''}`} href={pageHref(Math.min(pageCount, page + 1))}>Next</Link></div>
      </nav>}
    </div>
  );
}
