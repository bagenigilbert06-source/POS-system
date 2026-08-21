import type { Metadata } from 'next';
import { CalendarDays, Landmark, ReceiptText, WalletCards } from 'lucide-react';
import {
  getExpensePageData,
  type ExpenseFilters,
} from '@/app/actions/expenses';
import { DashboardPageHeading } from '@/components/dashboard/page-heading';
import { ExpenseManager } from '@/components/expenses/expense-manager';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { formatCurrency } from '@/lib/utils';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';

export const metadata: Metadata = { title: 'Expenses | Pesaby' };
export const dynamic = 'force-dynamic';

function dateValue(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authorization = await requireDashboardPermission(
    PermissionEnum.EXPENSE_VIEW
  );
  const [{ organization }, params] = await Promise.all([
    requireWorkspaceModule('expenses'),
    searchParams,
  ]);
  const value = (key: string) => {
    const item = params?.[key];
    return Array.isArray(item) ? item[0] : item;
  };
  const optional = (key: string) => {
    const item = value(key);
    return item && item !== 'all' ? item : undefined;
  };
  const filters: ExpenseFilters = {
    search: optional('search'),
    category: optional('category') as ExpenseFilters['category'],
    paymentMethod: optional('paymentMethod') as ExpenseFilters['paymentMethod'],
    branchId: optional('branchId'),
    from: dateValue(optional('from')),
    to: dateValue(optional('to')),
    page: Number(value('page') ?? 1),
    pageSize: Number(value('pageSize') ?? 25),
  };
  const data = await getExpensePageData(filters);
  const currency = organization.currency || 'KES';
  const metrics = [
    {
      label: 'Today',
      value: formatCurrency(data.summary.todayTotal, currency),
      detail: `${data.summary.todayCount} records`,
      icon: CalendarDays,
    },
    {
      label: 'This month',
      value: formatCurrency(data.summary.monthTotal, currency),
      detail: `${data.summary.monthCount} records`,
      icon: ReceiptText,
    },
    {
      label: 'Largest this month',
      value: formatCurrency(data.summary.monthLargest, currency),
      detail: 'Single expense',
      icon: Landmark,
    },
    {
      label: 'All recorded',
      value: formatCurrency(data.summary.allTotal, currency),
      detail: `${data.summary.allCount} records`,
      icon: WalletCards,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5 pb-8">
      <DashboardPageHeading
        theme="adaptive"
        icon={WalletCards}
        eyebrow="Operating costs"
        title="Expenses"
        description="Record, trace and control every business expense by location and payment method."
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value: metricValue, detail, icon: Icon }) => (
          <article key={label} className="metric-card min-h-[126px] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums">
                  {metricValue}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </article>
        ))}
      </section>
      <ExpenseManager
        data={data}
        filters={filters}
        currency={currency}
        canManage={authorization.permissions.includes(
          PermissionEnum.EXPENSE_MANAGE
        )}
      />
    </div>
  );
}
