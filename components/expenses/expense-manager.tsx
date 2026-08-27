'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import {
  createExpense,
  deleteExpense,
  getExpensePageData,
  updateExpense,
  type ExpenseFilters,
} from '@/app/actions/expenses';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '@/lib/expenses';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type ExpenseData = Awaited<ReturnType<typeof getExpensePageData>>;
type ExpenseRow = ExpenseData['rows'][number];

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateInput = (value: Date | string = new Date()) => {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export function ExpenseManager({
  data,
  filters,
  currency,
  canManage,
}: {
  data: ExpenseData;
  filters: ExpenseFilters;
  currency: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [pending, startTransition] = useTransition();
  const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
  const href = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '')
        params.set(
          key,
          value instanceof Date ? dateInput(value) : String(value)
        );
    });
    params.set('page', String(page));
    return `/dashboard/expenses?${params.toString()}`;
  };

  function closeEditor() {
    setOpen(false);
    setEditing(null);
  }
  function submit(formData: FormData) {
    const input = {
      title: String(formData.get('title')),
      amount: Number(formData.get('amount')),
      category: String(
        formData.get('category')
      ) as (typeof EXPENSE_CATEGORIES)[number],
      paymentMethod: String(
        formData.get('paymentMethod')
      ) as (typeof EXPENSE_PAYMENT_METHODS)[number],
      branchId: String(formData.get('branchId')),
      expenseDate: new Date(`${String(formData.get('expenseDate'))}T12:00:00`),
      reference: String(formData.get('reference') || ''),
      notes: String(formData.get('notes') || ''),
    };
    startTransition(async () => {
      try {
        if (editing) await updateExpense(editing.record.id, input);
        else await createExpense(input);
        notify.success(editing ? 'Expense updated' : 'Expense recorded');
        closeEditor();
        router.refresh();
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : 'Could not save expense'
        );
      }
    });
  }
  function remove(id: string) {
    if (!window.confirm('Delete this expense record? This cannot be undone.'))
      return;
    startTransition(async () => {
      try {
        await deleteExpense(id);
        notify.success('Expense deleted');
        router.refresh();
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : 'Could not delete expense'
        );
      }
    });
  }

  return (
    <>
      <section className="app-panel overflow-hidden border">
        <form
          method="get"
          className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_170px_170px_145px_145px_auto]"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              defaultValue={String(filters.search ?? '')}
              placeholder="Search description, reference or notes"
              className="pl-9"
            />
          </div>
          <Select
            name="category"
            defaultValue={String(filters.category ?? 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {EXPENSE_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {titleCase(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            name="paymentMethod"
            defaultValue={String(filters.paymentMethod ?? 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="All payments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              {EXPENSE_PAYMENT_METHODS.map((item) => (
                <SelectItem key={item} value={item}>
                  {titleCase(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            name="branchId"
            defaultValue={String(filters.branchId ?? 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {data.locations.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="From date"
            name="from"
            type="date"
            defaultValue={
              filters.from ? dateInput(filters.from as Date | string) : ''
            }
          />
          <Input
            aria-label="To date"
            name="to"
            type="date"
            defaultValue={
              filters.to ? dateInput(filters.to as Date | string) : ''
            }
          />
          <div className="flex gap-2">
            <Button type="submit" variant="outline">
              Filter
            </Button>
            <Button asChild type="button" variant="ghost">
              <Link href="/dashboard/expenses">Reset</Link>
            </Button>
          </div>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-lg font-semibold">Expense records</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Trace operating costs by date, payment method and location.
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="gap-2 bg-[var(--dashboard-accent-cta)] font-bold text-[var(--dashboard-accent-cta-ink)] hover:bg-[var(--dashboard-accent-cta-hover)]"
            >
              <Plus className="h-4 w-4" />
              Record expense
            </Button>
          )}
        </div>
        {data.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead className="bg-[var(--dashboard-surface-subtle)] text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Expense</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  {canManage && (
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map((row) => (
                  <tr
                    key={row.record.id}
                    className="transition-colors hover:bg-[var(--dashboard-surface-subtle)]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
                          <WalletCards className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="max-w-[320px] truncate font-semibold">
                              {row.record.title}
                            </p>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {titleCase(row.record.category)}
                            </span>
                          </div>
                          <p className="mt-1 max-w-[420px] truncate text-xs text-muted-foreground">
                            {row.record.reference
                              ? `Ref: ${row.record.reference}`
                              : 'No reference'}
                            {row.record.notes ? ` · ${row.record.notes}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium">
                        {new Date(row.record.expenseDate).toLocaleDateString()}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Logged {formatDateTime(row.record.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {row.branchName ?? 'Workspace'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 capitalize">
                        <ReceiptText className="h-3.5 w-3.5 text-muted-foreground" />
                        {titleCase(row.record.paymentMethod)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                      {formatCurrency(row.record.amount, currency)}
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditing(row);
                              setOpen(true);
                            }}
                            className="rounded-full p-2 text-muted-foreground hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Edit ${row.record.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            disabled={pending}
                            onClick={() => remove(row.record.id)}
                            className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Delete ${row.record.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <WalletCards className="h-6 w-6 text-muted-foreground" />
            </span>
            <p className="mt-4 font-semibold">No expenses found</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Record an operating cost or change the filters to see matching
              records.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
          <p className="text-xs tabular-nums text-muted-foreground">
            {data.total
              ? `Showing ${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} of ${data.total}`
              : '0 records'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              asChild={data.page > 1}
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
            >
              {data.page > 1 ? (
                <Link href={href(data.page - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Link>
              ) : (
                <span>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </span>
              )}
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              Page {data.page} of {pageCount}
            </span>
            <Button
              asChild={data.page < pageCount}
              variant="outline"
              size="sm"
              disabled={data.page >= pageCount}
            >
              {data.page < pageCount ? (
                <Link href={href(data.page + 1)}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              ) : (
                <span>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit expense' : 'Record an expense'}
            </DialogTitle>
          </DialogHeader>
          <form action={submit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="expense-title">Description</Label>
              <Input
                id="expense-title"
                name="title"
                required
                minLength={2}
                maxLength={120}
                defaultValue={editing?.record.title ?? ''}
                placeholder="e.g. August shop rent"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount ({currency})</Label>
                <Input
                  id="expense-amount"
                  name="amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  defaultValue={editing?.record.amount ?? ''}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-date">Expense date</Label>
                <div className="relative">
                  <Input
                    id="expense-date"
                    name="expenseDate"
                    type="date"
                    required
                    defaultValue={
                      editing
                        ? dateInput(editing.record.expenseDate)
                        : dateInput()
                    }
                    className="pr-9"
                  />
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  name="category"
                  defaultValue={editing?.record.category ?? 'general'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {titleCase(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select
                  name="paymentMethod"
                  defaultValue={editing?.record.paymentMethod ?? 'cash'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_PAYMENT_METHODS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {titleCase(item)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  name="branchId"
                  defaultValue={
                    editing?.record.branchId ?? data.locations[0]?.id
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose location" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.locations.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-reference">
                  Reference{' '}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="expense-reference"
                  name="reference"
                  maxLength={100}
                  defaultValue={editing?.record.reference ?? ''}
                  placeholder="Receipt or invoice number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-notes">
                Notes{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <textarea
                id="expense-notes"
                name="notes"
                maxLength={500}
                rows={3}
                defaultValue={editing?.record.notes ?? ''}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Supplier or other context"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button
                disabled={pending || !data.locations.length}
                className="bg-[var(--dashboard-accent-cta)] font-bold text-[var(--dashboard-accent-cta-ink)] hover:bg-[var(--dashboard-accent-cta-hover)]"
              >
                {pending
                  ? 'Saving…'
                  : editing
                    ? 'Save changes'
                    : 'Save expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
