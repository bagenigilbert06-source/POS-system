import Link from 'next/link';
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  ArrowRight,
  BadgeDollarSign,
  CircleDollarSign,
  ReceiptText,
  RefreshCcw,
} from 'lucide-react';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { db } from '@/lib/db';
import {
  branch,
  creditSale,
  externalFinancialTransaction,
  financialAccount,
  organization,
  sale,
} from '@/lib/db/schema';
import { getReportsOverview } from '@/lib/services/reports-service';
import { PermissionEnum } from '@/lib/types/permissions';

const cash = (value: number | string, currency: string) =>
  `${currency} ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const metadata = { title: 'Financial Overview' };

export default async function FinancialOverview({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; from?: string; to?: string }>;
}) {
  const context = await requireDashboardPermission(PermissionEnum.FINANCE_VIEW);
  const params = await searchParams;
  const [org, branches] = await Promise.all([
    db
      .select({
        currency: organization.currency,
        timezone: organization.timezone,
      })
      .from(organization)
      .where(eq(organization.id, context.organizationId))
      .limit(1)
      .then((rows) => rows[0]),
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
  const selected =
    params.branch && branches.some((item) => item.id === params.branch)
      ? [params.branch]
      : context.isOrganizationWide
        ? undefined
        : context.branchIds;
  const report = await getReportsOverview(
    context.organizationId,
    org?.timezone || 'UTC',
    { branchIds: selected, from: params.from, to: params.to }
  );
  const saleScope =
    selected === undefined
      ? undefined
      : selected.length
        ? inArray(sale.branchId, selected)
        : sql`false`;
  const [ar, reconciliation] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${creditSale.amount} - ${creditSale.amountPaid} - ${creditSale.creditedAmount}),0)`,
      })
      .from(creditSale)
      .innerJoin(sale, eq(sale.id, creditSale.saleId))
      .where(
        and(
          eq(creditSale.orgId, context.organizationId),
          saleScope,
          sql`${creditSale.amount} > ${creditSale.amountPaid} + ${creditSale.creditedAmount}`
        )
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(externalFinancialTransaction)
      .innerJoin(financialAccount, eq(financialAccount.id, externalFinancialTransaction.financialAccountId))
      .where(
        and(
          eq(
            externalFinancialTransaction.organizationId,
            context.organizationId
          ),
          eq(externalFinancialTransaction.status, 'unmatched'),
          context.isOrganizationWide ? undefined : or(isNull(financialAccount.branchId), inArray(financialAccount.branchId, context.branchIds))
        )
      ),
  ]);
  const currency = org?.currency || 'KES';
  const reliable = report.totals.costDataComplete;
  const metrics = [
    [
      'Net sales',
      cash(report.totals.revenue, currency),
      'Gross sales less discounts and completed refunds',
    ],
    [
      'Gross profit',
      reliable ? cash(report.totals.grossProfit, currency) : 'Cost unavailable',
      reliable
        ? 'Net sales less FIFO COGS'
        : 'Some sold items have incomplete cost data',
    ],
    [
      'Cost of goods sold',
      reliable ? cash(report.totals.costOfGoods, currency) : 'Cost unavailable',
      reliable ? 'FIFO cost of completed sales' : 'Some sold items have incomplete cost data',
    ],
    [
      'Expenses',
      cash(report.totals.expenses, currency),
      'Recorded operating expenses',
    ],
    [
      'Operating profit',
      reliable ? cash(report.totals.netProfit, currency) : 'Cost unavailable',
      reliable
        ? 'Gross profit less operating expenses'
        : 'Not shown until COGS is reliable',
    ],
    [
      'Receivables',
      cash(ar[0]?.total ?? 0, currency),
      'Open customer-credit balances',
    ],
    [
      'Tax collected',
      cash(report.totals.tax, currency),
      'Tax recorded on completed sales',
    ],
    [
      'Refunds & discounts',
      cash(report.totals.refunds + report.totals.discounts, currency),
      'Completed refunds plus sale discounts',
    ],
    [
      'Unreconciled',
      String(reconciliation[0]?.count ?? 0),
      'Imported provider or bank transactions',
    ],
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <DashboardPageHeading
        icon={CircleDollarSign}
        title="Financial Overview"
        description="A source-backed retail finance view. No balance sheet or trial balance is shown without a real double-entry ledger."
      />
      <form className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <label className="space-y-1 text-xs font-medium">
          From
          <input
            name="from"
            type="date"
            defaultValue={params.from}
            className="block h-9 rounded-md border bg-background px-3 text-sm"
          />
        </label>
        <label className="space-y-1 text-xs font-medium">
          To
          <input
            name="to"
            type="date"
            defaultValue={params.to}
            className="block h-9 rounded-md border bg-background px-3 text-sm"
          />
        </label>
        {branches.length > 1 && (
          <label className="space-y-1 text-xs font-medium">
            Branch
            <select
              name="branch"
              defaultValue={params.branch || ''}
              className="block h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All authorized branches</option>
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Apply filters
        </button>
        <p className="ml-auto text-xs text-muted-foreground">
          {report.period.label}
        </p>
      </form>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value, detail]) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">Retail Profit &amp; Loss</h2>
            <p className="text-xs text-muted-foreground">
              All figures use the same report service as Pesaby Reports.
            </p>
          </div>
          <div className="space-y-3 p-5 text-sm">
            {[
              ['Gross sales', report.totals.grossSales],
              ['Discounts', -report.totals.discounts],
              ['Refunds', -report.totals.refunds],
              ['Net sales', report.totals.revenue],
              ['COGS', reliable ? -report.totals.costOfGoods : null],
              ['Gross profit', reliable ? report.totals.grossProfit : null],
              ['Operating expenses', -report.totals.expenses],
              ['Operating profit', reliable ? report.totals.netProfit : null],
            ].map(([label, value], index) => (
              <div
                key={label as string}
                className={`flex justify-between ${[3, 5, 7].includes(index) ? 'border-t pt-3 font-semibold' : ''}`}
              >
                <span>{label}</span>
                <span>
                  {value == null
                    ? 'Cost unavailable'
                    : cash(value as number, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">Finance workspace</h2>
            <p className="text-xs text-muted-foreground">
              Operational views that explain every open balance.
            </p>
          </div>
          <div className="divide-y">
            {[
              [
                ReceiptText,
                'Invoices',
                '/dashboard/invoices',
                'Issue invoices and trace every payment or credit note.',
              ],
              [
                BadgeDollarSign,
                'Accounts receivable',
                '/dashboard/receivables',
                'Customer balances, ageing, and statements.',
              ],
              [
                CircleDollarSign,
                'Payment accounts',
                '/dashboard/finance/accounts',
                'Cash, M-Pesa, card, and bank settlement accounts.',
              ],
              [
                RefreshCcw,
                'Reconciliation',
                '/dashboard/finance/reconciliation',
                'Match provider and bank statements to Pesaby payments.',
              ],
            ].map(([Icon, title, href, detail]) => {
              const Component = Icon as typeof ReceiptText;
              return (
                <Link
                  key={href as string}
                  href={href as string}
                  className="flex items-center gap-3 p-4 hover:bg-muted/30"
                >
                  <Component className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{title as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {detail as string}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">Payment breakdown</h2>
          <p className="text-xs text-muted-foreground">
            Completed sales grouped by their recorded payment method.
          </p>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {report.payments.length ? (
            report.payments.map((payment) => (
              <div key={payment.method} className="bg-card p-4">
                <p className="text-xs font-medium capitalize text-muted-foreground">
                  {payment.method.replaceAll('_', ' ')}
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {cash(payment.amount, currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payment.transactions} transaction{payment.transactions === 1 ? '' : 's'}
                </p>
              </div>
            ))
          ) : (
            <p className="bg-card p-5 text-sm text-muted-foreground sm:col-span-2 lg:col-span-4">
              No completed payments in this period.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
