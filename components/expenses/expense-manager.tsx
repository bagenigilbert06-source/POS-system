'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Undo2,
  WalletCards,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import {
  createExpense,
  getExpensePageData,
  updateExpensePresentation,
  voidExpense,
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
import { formatCurrency } from '@/lib/utils';

type ExpenseData = Awaited<ReturnType<typeof getExpensePageData>>;
type ExpenseRow = ExpenseData['rows'][number];

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusVisual = {
  effective: {
    label: 'Approved',
    tone: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  pending: {
    label: 'Pending',
    tone: 'border-sky-500/25 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  rejected: {
    label: 'Rejected',
    tone: 'border-red-500/25 bg-red-500/15 text-red-700 dark:text-red-300',
  },
  voided: {
    label: 'Voided',
    tone: 'border-border bg-muted text-muted-foreground',
  },
} as const;
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
  const [selected, setSelected] = useState<ExpenseRow | null>(null);
  const [voidTarget, setVoidTarget] = useState<ExpenseRow | null>(null);
  const [editTarget, setEditTarget] = useState<ExpenseRow | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
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
      paymentMethod: String(formData.get('paymentMethod')) as (typeof EXPENSE_PAYMENT_METHODS)[number],
      financialAccountId: String(formData.get('financialAccountId') || ''),
      branchId: String(formData.get('branchId')),
      expenseDate: new Date(`${String(formData.get('expenseDate'))}T12:00:00`),
      reference: String(formData.get('reference') || ''),
      notes: String(formData.get('notes') || ''),
      payee: String(formData.get('payee') || ''),
      idempotencyKey: crypto.randomUUID(),
    };
    startTransition(async () => {
      try {
        if (editing) throw new Error('Posted expenses cannot be edited. Void and record a corrected expense instead.');
        const result = await createExpense(input);
        const document = formData.get('document');
        if (document instanceof File && document.size > 0) {
          const upload = new FormData();
          upload.set('file', document);
          upload.set('entityType', 'expense');
          upload.set('entityId', result.id);
          const response = await fetch('/api/finance/documents', { method: 'POST', body: upload });
          if (!response.ok) throw new Error((await response.json()).error || 'Expense saved, but the document upload failed.');
        }
        notify.success(result.status === 'pending' ? 'Expense submitted for approval' : `Expense ${result.expenseNo} recorded`);
        closeEditor();
        router.refresh();
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : 'Could not save expense'
        );
      }
    });
  }
  function confirmVoid() {
    if (!voidTarget || voidReason.trim().length < 3) return;
    startTransition(async () => {
      try {
        await voidExpense(voidTarget.record.id, voidReason.trim());
        notify.success('Expense voided');
        setVoidTarget(null);
        setVoidReason('');
        router.refresh();
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : 'Could not delete expense'
        );
      }
    });
  }
  function saveEdit(formData: FormData) {
    if (!editTarget) return;
    startTransition(async () => {
      try {
        await updateExpensePresentation(editTarget.record.id, {
          title: String(formData.get('title')),
          payee: String(formData.get('payee') || ''),
          category: String(formData.get('category')) as (typeof EXPENSE_CATEGORIES)[number],
          reference: String(formData.get('reference') || ''),
          notes: String(formData.get('notes') || ''),
        });
        notify.success('Expense details updated');
        setEditTarget(null);
        router.refresh();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : 'Could not update expense');
      }
    });
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <form
          method="get"
          className="flex flex-wrap items-center gap-2.5 border-b border-border px-5 py-4"
        >
          <div className="relative mr-auto w-full sm:w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              defaultValue={String(filters.search ?? '')}
              placeholder="Search description, reference or notes"
              className="h-10 border-border bg-background pl-9 shadow-none"
            />
          </div>
          <Select
            name="category"
            defaultValue={String(filters.category ?? 'all')}
          >
            <SelectTrigger className="h-10 w-[145px] border-border bg-background shadow-none">
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
            <SelectTrigger className="h-10 w-[145px] border-border bg-background shadow-none">
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
            <SelectTrigger className="h-10 w-[145px] border-border bg-background shadow-none">
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
          <Select name="status" defaultValue={String(filters.status ?? 'all')}>
            <SelectTrigger className="h-10 w-[145px] border-border bg-background shadow-none"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="effective">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
          <Input
            aria-label="From date"
            name="from"
            type="date"
            defaultValue={
              filters.from ? dateInput(filters.from as Date | string) : ''
            }
            className="h-10 w-[138px] border-border bg-background shadow-none"
          />
          <Input
            aria-label="To date"
            name="to"
            type="date"
            defaultValue={
              filters.to ? dateInput(filters.to as Date | string) : ''
            }
            className="h-10 w-[138px] border-border bg-background shadow-none"
          />
          <div className="flex gap-1">
            <Button type="submit" variant="outline" className="h-10 border-border shadow-none">
              Filter
            </Button>
            <Button asChild type="button" variant="ghost" className="h-10">
              <Link href="/dashboard/expenses">Reset</Link>
            </Button>
          </div>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Expense records</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Trace operating costs by date, payment method and location.
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setPaymentMethod('cash');
                setOpen(true);
              }}
              className="h-10 gap-2 bg-[var(--dashboard-accent)] px-4 font-semibold text-[var(--dashboard-accent-cta-ink)] shadow-sm hover:bg-[var(--dashboard-accent-cta-hover)]"
            >
              <Plus className="h-4 w-4" />
              Record expense
            </Button>
          )}
        </div>
        {data.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="border-y border-border bg-muted/45 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Expense name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
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
                    className="border-b border-border/70 transition-colors hover:bg-muted/45"
                  >
                    <td className="px-5 py-4 font-medium tabular-nums text-muted-foreground">
                      {row.record.expenseNo}
                    </td>
                    <td className="px-4 py-4"><p className="max-w-[210px] truncate font-medium">{row.record.title}</p></td>
                    <td className="px-4 py-4 text-muted-foreground">{titleCase(row.record.category)}</td>
                    <td className="px-4 py-4"><p className="max-w-[280px] truncate text-muted-foreground">{row.record.notes || [row.record.payee, titleCase(row.record.paymentMethod), row.branchName].filter(Boolean).join(' · ') || '—'}</p><p className="mt-1 text-xs text-muted-foreground">{row.record.reference ? `External: ${row.record.reference}` : row.record.payee ? `Paid to ${row.record.payee}` : ''}</p></td>
                    <td className="px-4 py-4"><p className="whitespace-nowrap font-medium">{new Date(row.record.expenseDate).toLocaleDateString()}</p><p className="mt-1 text-xs text-muted-foreground">{row.branchName ?? 'Workspace'}</p></td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">
                      {formatCurrency(row.record.amount, currency)}
                    </td>
                    <td className="px-4 py-3.5">{(() => { const status = statusVisual[row.record.status as keyof typeof statusVisual] ?? statusVisual.voided; return <span className={`inline-flex min-w-[72px] justify-center rounded-md border px-2.5 py-1 text-[11px] font-semibold leading-none ${status.tone}`}>{status.label}</span>; })()}</td>
                    {canManage && (
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setSelected(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`View ${row.record.title}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {!['voided', 'rejected'].includes(row.record.status) && <button onClick={() => setEditTarget(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Edit ${row.record.title}`}><Pencil className="h-4 w-4" /></button>}
                          {row.record.status === 'effective' && <button
                            disabled={pending}
                            onClick={() => { setVoidTarget(row); setVoidReason(''); }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Reverse ${row.record.title}`}
                          >
                            <Undo2 className="h-4 w-4" />
                          </button>}
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/25 px-5 py-3">
          <p className="text-xs font-medium tabular-nums text-muted-foreground">
            {data.total
              ? `Showing ${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} of ${data.total}`
              : '0 records'}
          </p>
          {pageCount > 1 && <div className="flex items-center rounded-lg border border-border bg-background p-1 shadow-sm">
            <Button
              asChild={data.page > 1}
              variant="ghost"
              size="sm"
              disabled={data.page <= 1}
              className="h-8 w-8 rounded-md p-0 disabled:opacity-35"
            >
              {data.page > 1 ? (
                <Link href={href(data.page - 1)} aria-label="Previous page" title="Previous page"><ChevronLeft className="h-4 w-4" /></Link>
              ) : (
                <span aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></span>
              )}
            </Button>
            <span className="min-w-20 px-2 text-center text-xs font-semibold tabular-nums text-foreground">
              {data.page} <span className="font-normal text-muted-foreground">of</span> {pageCount}
            </span>
            <Button
              asChild={data.page < pageCount}
              variant="ghost"
              size="sm"
              disabled={data.page >= pageCount}
              className="h-8 w-8 rounded-md p-0 disabled:opacity-35"
            >
              {data.page < pageCount ? (
                <Link href={href(data.page + 1)} aria-label="Next page" title="Next page"><ChevronRight className="h-4 w-4" /></Link>
              ) : (
                <span aria-label="Next page"><ChevronRight className="h-4 w-4" /></span>
              )}
            </Button>
          </div>}
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
              Record an expense
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
            <div className="space-y-2">
              <Label htmlFor="expense-payee">Paid to / Payee</Label>
              <Input id="expense-payee" name="payee" maxLength={160} placeholder="e.g. Kenya Power" />
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
                <select name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  {EXPENSE_PAYMENT_METHODS.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
                </select>
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
                  External reference{' '}
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
            {paymentMethod !== 'cash' && <div className="space-y-2">
              <Label htmlFor="expense-account">Payment Account *</Label>
              <select id="expense-account" name="financialAccountId" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                <option value="">Select Payment Account</option>
                {data.accounts.filter((account) => ({ mpesa: ['mpesa_till', 'mpesa_paybill'], airtel_money: ['airtel_money'], card: ['card_settlement'], bank: ['bank'] }[paymentMethod] ?? []).includes(account.type)).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
              </select>
            </div>}
            {paymentMethod === 'cash' && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Cash expenses are posted as a linked cash-out from your current active POS drawer. You cannot save this expense without an active shift.</p>}
            <div className="space-y-2">
              <Label htmlFor="expense-document">Receipt / document <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="expense-document" name="document" type="file" accept="application/pdf,image/jpeg,image/png" />
              <p className="text-xs text-muted-foreground">PDF, JPG, or PNG; maximum 10 MB.</p>
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
                placeholder="Additional context or reason"
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
                  : 'Save expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selected} onOpenChange={(value) => !value && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Expense details</DialogTitle></DialogHeader>
          {selected && <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Detail label="Internal reference" value={selected.record.expenseNo} />
            <Detail label="Status" value={(statusVisual[selected.record.status as keyof typeof statusVisual] ?? statusVisual.voided).label} />
            <Detail label="Description" value={selected.record.title} />
            <Detail label="Paid to / Payee" value={selected.record.payee || '—'} />
            <Detail label="Amount" value={formatCurrency(selected.record.amount, currency)} />
            <Detail label="Category" value={titleCase(selected.record.category)} />
            <Detail label="Expense date" value={new Date(selected.record.expenseDate).toLocaleDateString()} />
            <Detail label="Location" value={selected.branchName ?? 'Workspace'} />
            <Detail label="Payment method" value={titleCase(selected.record.paymentMethod)} />
            <Detail label="Payment account" value={selected.accountName ?? '—'} />
            <Detail label="External reference" value={selected.record.reference || '—'} />
            <Detail label="Recorded by" value={selected.creatorName ?? '—'} />
            <Detail label="Linked cash movement" value={selected.record.cashMovementId ? 'Recorded in POS cash operations' : '—'} />
            <Detail label="Notes" value={selected.record.notes || '—'} />
            <div className="col-span-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Receipt / document</p>{data.documents.filter((document) => document.entityId === selected.record.id).length ? <div className="mt-2 flex flex-wrap gap-2">{data.documents.filter((document) => document.entityId === selected.record.id).map((document) => <a key={document.id} href={`/api/finance/documents/${document.id}`} className="rounded-md border px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted">Download {document.filename}</a>)}</div> : <p className="mt-1 font-medium">—</p>}</div>
          </div>}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTarget} onOpenChange={(value) => !value && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit expense</DialogTitle></DialogHeader>
          {editTarget && <form action={saveEdit} className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">{editTarget.record.expenseNo}. Amount, payment method, account, branch, and date remain locked after posting.</p>
            <div className="space-y-2"><Label htmlFor="edit-expense-title">Expense name</Label><Input id="edit-expense-title" name="title" required maxLength={120} defaultValue={editTarget.record.title} /></div>
            <div className="space-y-2"><Label htmlFor="edit-expense-payee">Paid to / Payee</Label><Input id="edit-expense-payee" name="payee" maxLength={160} defaultValue={editTarget.record.payee ?? ''} /></div>
            <div className="space-y-2"><Label>Category</Label><Select name="category" defaultValue={editTarget.record.category}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXPENSE_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{titleCase(item)}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="edit-expense-reference">External reference</Label><Input id="edit-expense-reference" name="reference" maxLength={100} defaultValue={editTarget.record.reference ?? ''} /></div>
            <div className="space-y-2"><Label htmlFor="edit-expense-notes">Notes</Label><textarea id="edit-expense-notes" name="notes" rows={3} maxLength={500} defaultValue={editTarget.record.notes ?? ''} className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button><Button disabled={pending}>Save changes</Button></div>
          </form>}
        </DialogContent>
      </Dialog>
      <Dialog open={!!voidTarget} onOpenChange={(value) => { if (!value) { setVoidTarget(null); setVoidReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reverse expense</DialogTitle></DialogHeader>
          {voidTarget && <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Reverse <span className="font-medium text-foreground">{voidTarget.record.expenseNo}</span> for <span className="font-medium text-foreground">{formatCurrency(voidTarget.record.amount, currency)}</span>? This preserves the original expense and writes an audit record.</p>
            {voidTarget.record.cashMovementId && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">If its POS shift is still open, Pesaby will post a linked cash-in reversal. Closed shifts require a supervised cash adjustment.</p>}
            <div className="space-y-2"><Label htmlFor="void-reason">Reason for reversal</Label><textarea id="void-reason" value={voidReason} onChange={(event) => setVoidReason(event.target.value)} maxLength={500} rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Explain why this expense is being reversed" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setVoidTarget(null); setVoidReason(''); }}>Cancel</Button><Button disabled={pending || voidReason.trim().length < 3} variant="destructive" onClick={confirmVoid}>{pending ? 'Reversing…' : 'Reverse expense'}</Button></div>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>;
}
