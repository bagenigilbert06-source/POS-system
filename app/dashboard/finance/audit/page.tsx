import { and, count, desc, eq, gte, ilike, inArray, lt, or, sql } from 'drizzle-orm';
import { ShieldCheck } from 'lucide-react';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { db } from '@/lib/db';
import { auditEvent, branch, user } from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';
import { formatFinanceAuditEvent } from '@/lib/finance/audit-presentation';
import { money as formatMoney } from '@/lib/finance/money';

const prefixes = [
  'invoice.',
  'financial_account.',
  'reconciliation.',
  'finance_approval.',
  'expense.',
  'credit_',
  'customer_credit_',
  'refund',
  'sale_',
  'sales.return_',
  'card_payment_',
  'etims_',
  'shift.',
  'inventory.stock_intake_',
];
const actionGroups = [
  ['all', 'All finance activity'],
  ['invoice.', 'Invoices'],
  ['expense.', 'Expenses'],
  ['credit_', 'Customer credit'],
  ['refund', 'Refunds'],
  ['sale_', 'Sales'],
  ['sales.return_', 'Sales returns'],
  ['financial_account.', 'Payment accounts'],
  ['card_payment_', 'Card payments'],
  ['reconciliation.', 'Reconciliation'],
  ['shift.', 'POS shifts'],
  ['etims_', 'eTIMS'],
  ['inventory.stock_intake_', 'Stock Intake'],
  ['finance_approval.', 'Approvals'],
] as const;
const pageSizeOptions = [20, 50, 100] as const;
type AuditValue = null | boolean | number | string | AuditValue[] | { [key: string]: AuditValue };

function isAuditRecord(value: unknown): value is { [key: string]: AuditValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function humanize(value: string) {
  if (value === 'policyId') return 'Policy Reference';
  if (value === 'branchId') return 'Branch Reference';
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactReference(key: string, value: string) {
  const prefixes: Record<string, string> = { policyId: 'POL', branchId: 'BR', approvalId: 'APR', invoiceId: 'INV', expenseId: 'EXP', paymentId: 'PAY', reconciliationId: 'REC' };
  const prefix = prefixes[key];
  return prefix ? `${prefix}-${value.slice(-6).toUpperCase()}` : `${value.slice(0, 8)}…`;
}

function displayValue(value: AuditValue, key?: string): string {
  if (value === null) return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const moneyKeys = ['amount', 'total', 'subtotal', 'tax', 'taxAmount', 'discount', 'discountAmount', 'thresholdAmount', 'beforeAmount', 'afterAmount', 'beforeBalance', 'afterBalance', 'previousLimit', 'newLimit', 'amountReceived'];
  if (typeof value === 'string' && key && moneyKeys.includes(key) && Number.isFinite(Number(value))) return `KES ${formatMoney(value).toNumber().toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (typeof value === 'string' && key?.endsWith('Id')) return compactReference(key, value);
  if (Array.isArray(value)) {
    if (!value.length) return 'None';
    return value.every((item) => !isAuditRecord(item)) ? value.map((item) => displayValue(item, key)).join(', ') : `${value.length} recorded items`;
  }
  if (isAuditRecord(value)) return 'Details available below';
  return String(value);
}

function AuditDetails({ value, depth = 0, technical = false }: { value: AuditValue; depth?: number; technical?: boolean }) {
  if (!isAuditRecord(value) || depth > 2) return null;
  const entries = Object.entries(value).filter(([key, item]) => (technical || (!key.endsWith('Id') && key !== 'idempotencyKey' && key !== 'requestId')) && item !== null && item !== '' && !(Array.isArray(item) && item.length === 0));
  return <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{entries.map(([key, item]) => <div key={key} className="min-w-0"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{humanize(key)}</dt><dd className="mt-0.5 break-words text-sm text-foreground">{isAuditRecord(item) ? <div className="mt-1 rounded-md border bg-background/60 p-2"><p className="mb-2 text-xs font-semibold">{humanize(key)} details</p><AuditDetails value={item} depth={depth + 1} technical={technical} /></div> : displayValue(item, key)}</dd></div>)}</dl>;
}

function validPage(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function dateParam(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function FinanceAuditPage({
  searchParams,
}: {
    searchParams: Promise<{
    q?: string;
    action?: string;
    actionGroup?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
    actor?: string;
    branch?: string;
  }>;
}) {
  const context = await requireDashboardPermission(
    PermissionEnum.AUDIT_LOG_VIEW
  );
  const params = await searchParams;
  const branches = await db
    .select({ id: branch.id, name: branch.name })
    .from(branch)
    .where(
      and(
        eq(branch.organizationId, context.organizationId),
        context.isOrganizationWide ? undefined : inArray(branch.id, context.branchIds)
      )
    )
    .orderBy(branch.name);
  const page = validPage(params.page, 1);
  const requestedPageSize = Number(params.pageSize);
  const pageSize = pageSizeOptions.includes(requestedPageSize as (typeof pageSizeOptions)[number])
    ? requestedPageSize
    : 20;
  const from = dateParam(params.from);
  const to = dateParam(params.to);
  const toExclusive = to
    ? new Date(`${to}T00:00:00.000Z`)
    : undefined;
  if (toExclusive) toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
  const selectedGroup = actionGroups.find(([value]) => value === params.actionGroup)?.[0] ?? 'all';
  const selectedGroupLabel = actionGroups.find(([value]) => value === selectedGroup)?.[1] ?? 'All finance activity';
  const financeActions = or(
    ...prefixes.map((prefix) => ilike(auditEvent.action, `${prefix}%`))
  );
  const scope = and(
    eq(auditEvent.organizationId, context.organizationId),
    context.isOrganizationWide
      ? undefined
      : inArray(sql<string>`${auditEvent.metadata}->>'branchId'`, context.branchIds),
    financeActions,
    selectedGroup !== 'all'
      ? ilike(auditEvent.action, `${selectedGroup}%`)
      : undefined,
    selectedGroup === 'all' ? sql`${auditEvent.action} <> 'sale_created'` : undefined,
    sql`${auditEvent.action} <> 'inventory.stock_intake_confirmed'`,
    params.action
      ? ilike(auditEvent.action, `%${params.action}%`)
      : undefined,
    params.actor ? ilike(user.name, `%${params.actor}%`) : undefined,
    params.branch ? eq(branch.id, params.branch) : undefined,
    params.q
      ? sql`${auditEvent.metadata}::text ilike ${`%${params.q}%`}`
      : undefined,
    from ? gte(auditEvent.createdAt, new Date(`${from}T00:00:00.000Z`)) : undefined,
    toExclusive ? lt(auditEvent.createdAt, toExclusive) : undefined
  );
  const [rows, totalRows] = await Promise.all([
    db
    .select({
      id: auditEvent.id,
      action: auditEvent.action,
      metadata: auditEvent.metadata,
      createdAt: auditEvent.createdAt,
      actor: user.name,
      branch: branch.name,
    })
    .from(auditEvent)
    .innerJoin(user, eq(user.id, auditEvent.userId))
    .leftJoin(branch, and(eq(branch.id, sql<string>`${auditEvent.metadata}->>'branchId'`), eq(branch.organizationId, context.organizationId)))
    .where(scope)
    .orderBy(desc(auditEvent.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(auditEvent).innerJoin(user, eq(user.id, auditEvent.userId)).leftJoin(branch, and(eq(branch.id, sql<string>`${auditEvent.metadata}->>'branchId'`), eq(branch.organizationId, context.organizationId))).where(scope),
  ]);
  const total = Number(totalRows[0]?.total ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.action) query.set('action', params.action);
  if (selectedGroup !== 'all') query.set('actionGroup', selectedGroup);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  if (params.actor) query.set('actor', params.actor);
  if (params.branch) query.set('branch', params.branch);
  query.set('pageSize', String(pageSize));
  const pageHref = (target: number) => {
    const next = new URLSearchParams(query);
    next.set('page', String(target));
    return `?${next.toString()}`;
  };
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
        <DashboardPageHeading
          theme="adaptive"
        icon={ShieldCheck}
        title="Finance Audit"
        description="Immutable review history for sensitive finance operations."
      />
      <form className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Find an audit record</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Review who changed what and when.</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{selectedGroupLabel}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Entity, reference, amount…"
          aria-label="Search audit details"
          className="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-2"
        />
        <input
          name="action"
          defaultValue={params.action}
          placeholder="Action type"
          aria-label="Filter by action type"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
        <select name="actionGroup" defaultValue={selectedGroup} aria-label="Filter by activity" className="h-9 rounded-md border bg-background px-3 text-sm">
          {actionGroups.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select name="branch" defaultValue={params.branch ?? ''} aria-label="Filter by branch" className="h-9 rounded-md border bg-background px-3 text-sm">
          <option value="">All authorized branches</option>
          {branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input name="from" type="date" defaultValue={from} className="h-9 rounded-md border bg-background px-3 text-sm" aria-label="From date" />
        <input name="to" type="date" defaultValue={to} className="h-9 rounded-md border bg-background px-3 text-sm" aria-label="To date" />
        <select name="pageSize" defaultValue={String(pageSize)} aria-label="Records per page" className="h-9 rounded-md border bg-background px-3 text-sm">
          {pageSizeOptions.map((size) => <option key={size} value={size}>{size} records per page</option>)}
        </select>
        <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Filter
        </button>
        <a href="/dashboard/finance/audit?pageSize=20" className="h-9 rounded-md border px-4 py-2 text-center text-sm font-medium">Clear</a>
        </div>
      </form>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No matching finance audit events.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((row) => (
              (() => {
                const event = formatFinanceAuditEvent(row);
                return <article
                key={row.id}
                className="grid gap-4 p-5 transition-colors hover:bg-muted/20 md:grid-cols-[190px_170px_1fr]"
              >
                <div>
                  <span className="mb-2 inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{event.category}</span>
                  <p className="text-sm font-semibold">{event.title}</p>
                  {event.reference && <p className="mt-1 text-xs font-medium text-muted-foreground">{event.reference}</p>}
                  {event.summary && <p className="mt-2 text-sm font-semibold">{event.summary}</p>}
                </div>
                <time dateTime={event.timestamp.toISOString()} className="text-xs text-muted-foreground">
                  <span className="block font-medium text-foreground">{event.actor}</span>
                  {event.branch && <span className="block">{event.branch}</span>}
                  <span className="mt-1 block">{event.timestamp.toLocaleString()}</span>
                </time>
                <details className="rounded-lg border bg-muted/20 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-primary">View details</summary>
                  <div className="mt-4 space-y-3">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {event.amount && <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</dt><dd className="text-sm font-semibold">{event.amount}</dd></div>}
                      {event.status && <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</dt><dd className="text-sm capitalize">{event.status.replaceAll('_', ' ')}</dd></div>}
                      {event.reason && <div className="sm:col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reason</dt><dd className="text-sm">{event.reason}</dd></div>}
                    </dl>
                    <AuditDetails value={event.details} />
                    <details className="rounded-md border bg-background/50 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Technical details</summary>
                      <div className="mt-3"><AuditDetails value={event.details} technical /></div>
                    </details>
                  </div>
                </details>
              </article>
              })()
            ))}
          </div>
        )}
      </section>
      <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" aria-label="Finance audit pagination">
        <span>{total ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} of ${total}` : 'Showing 0 of 0'}</span>
        <div className="flex items-center gap-2">
          {currentPage > 1 ? <a href={pageHref(currentPage - 1)} className="rounded-md border px-3 py-2 font-medium text-foreground">Previous</a> : <span className="rounded-md border px-3 py-2 opacity-40">Previous</span>}
          <span>Page {currentPage} of {pageCount}</span>
          {currentPage < pageCount ? <a href={pageHref(currentPage + 1)} className="rounded-md border px-3 py-2 font-medium text-foreground">Next</a> : <span className="rounded-md border px-3 py-2 opacity-40">Next</span>}
        </div>
      </nav>
    </div>
  );
}
