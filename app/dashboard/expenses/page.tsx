import type { Metadata } from 'next';
import { ReceiptText } from 'lucide-react';
import {
  getExpensePageData,
  type ExpenseFilters,
} from '@/app/actions/expenses';
import { ExpenseManager } from '@/components/expenses/expense-manager';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
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
    status: optional('status') as ExpenseFilters['status'],
    branchId: optional('branchId'),
    from: dateValue(optional('from')),
    to: dateValue(optional('to')),
    page: Number(value('page') ?? 1),
    pageSize: Number(value('pageSize') ?? 25),
  };
  const data = await getExpensePageData(filters);
  const currency = organization.currency || 'KES';

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-4 pb-8">
      <header className="flex items-center gap-3 px-1 py-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--dashboard-accent)] text-[var(--dashboard-accent-cta-ink)]"><ReceiptText className="h-4 w-4" /></span>
        <div><h1 className="text-xl font-bold tracking-tight">Expenses</h1><p className="mt-0.5 text-sm text-muted-foreground">Manage your business expenses</p></div>
      </header>
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
