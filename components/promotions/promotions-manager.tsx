'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FileSpreadsheet,
  Pencil,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  createPromotion,
  setPromotionActive,
  updatePromotion,
  type PromotionInput,
} from '@/app/actions/promotions';
import { notify } from '@/lib/notify';
import { formatCurrency } from '@/lib/utils';

export type PromotionRecord = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  kind: string;
  valueType: string;
  value: string;
  minimumSpend: string;
  maximumDiscount: string | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  createdBy: string | null;
};
type Kind = 'coupon' | 'discount' | 'bonus';
const copy: Record<
  Kind,
  { title: string; description: string; singular: string }
> = {
  coupon: {
    title: 'Coupons',
    description:
      'Create and manage codes customers can redeem at the register.',
    singular: 'Coupon',
  },
  discount: {
    title: 'Discounts',
    description: 'Manage scheduled discounts and promotional price reductions.',
    singular: 'Discount',
  },
  bonus: {
    title: 'Bonuses',
    description:
      'Manage bonus-value campaigns for your customer rewards programme.',
    singular: 'Bonus',
  },
};

export function PromotionsManager({
  kind,
  initialPromotions,
}: {
  kind: Kind;
  initialPromotions: PromotionRecord[];
}) {
  const [rows, setRows] = useState(initialPromotions);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [valueType, setValueType] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<PromotionRecord | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const text = copy[kind];
  const filtered = useMemo(() => {
    const matching = rows.filter(
        (row) =>
          (status === 'all' ||
            (status === 'active') === effectiveActive(row)) &&
          (valueType === 'all' || row.valueType === valueType) &&
          [row.name, row.code ?? '', row.description ?? ''].some((value) =>
            value.toLowerCase().includes(query.toLowerCase())
          )
      );
    return matching.sort((a, b) => {
      const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === 'oldest' ? -difference : difference;
    });
  }, [rows, query, status, valueType, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const csv = [
      [
        'Name',
        'Code',
        'Description',
        'Type',
        'Value',
        'Minimum spend',
        'Usage',
        'Start',
        'End',
        'Status',
      ],
      ...filtered.map((row) => [
        row.name,
        row.code ?? '',
        row.description ?? '',
        row.valueType,
        row.value,
        row.minimumSpend,
        `${row.usedCount}/${row.usageLimit ?? 'Unlimited'}`,
        dateLabel(row.startsAt),
        dateLabel(row.endsAt),
        effectiveActive(row) ? 'Active' : 'Inactive',
      ]),
    ]
      .map((line) =>
        line
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${kind}s.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const toggleActive = async (row: PromotionRecord) => {
    setBusyId(row.id);
    try {
      await setPromotionActive(row.id, !row.isActive);
      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, isActive: !item.isActive } : item
        )
      );
      notify.success(
        `${text.singular} ${row.isActive ? 'archived' : 'activated'}`
      );
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Could not update promotion'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1615px] space-y-5 pb-6 text-[#092454] dark:text-foreground">
      <header className="flex flex-col gap-4 border-b border-[#e1e7ef] pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-border">
        <div className="flex items-center gap-3">
          <button type="button" className="grid h-7 w-7 place-items-center rounded-full bg-[#f05a1a] text-white" aria-label="Back"><ChevronLeft className="h-4 w-4" /></button>
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight">
              {text.title}
            </h1>
            <p className="mt-1 text-sm text-[#667792] dark:text-muted-foreground">
              Manage Your {text.title}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-[#dce4ed] bg-white text-red-600 shadow-sm dark:border-border dark:bg-background" title="Export PDF"><FileText className="h-4 w-4 fill-current" /></button>
          <button
            type="button"
            onClick={exportCsv}
            className="grid h-9 w-9 place-items-center rounded-md border border-[#dce4ed] bg-white text-emerald-700 shadow-sm hover:bg-slate-50 dark:border-border dark:bg-background"
            title="Export Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setRows([...rows])} className="grid h-9 w-9 place-items-center rounded-md border border-[#dce4ed] bg-white text-[#526176] shadow-sm hover:bg-slate-50 dark:border-border dark:bg-background" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-[#dce4ed] bg-white text-[#526176] shadow-sm hover:bg-slate-50 dark:border-border dark:bg-background" title="Collapse"><ChevronDown className="h-4 w-4" /></button>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#f45113] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#d9410b]"
          >
            <PlusCircle className="h-4 w-4" />
            Add {text.singular}
          </button>
        </div>
      </header>
      <section className="overflow-hidden rounded-[10px] border border-[#dfe6ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)] dark:border-border dark:bg-card">
        <div className="flex flex-col gap-3 border-b border-[#e3e8ef] px-5 py-[18px] sm:flex-row sm:items-center sm:justify-between dark:border-border">
          <label className="relative w-full sm:max-w-[213px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1adbd]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="h-[38px] w-full rounded-md border border-[#dfe5ec] bg-white pl-9 pr-3 text-sm text-[#42526b] outline-none placeholder:text-[#9aa7b8] focus:ring-2 focus:ring-orange-500/25 dark:border-input dark:bg-background"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <select value={valueType} onChange={(event) => { setValueType(event.target.value); setPage(1); }} className="h-[37px] rounded-md border border-[#dfe5ec] bg-white px-3 text-sm text-[#243b63] dark:border-input dark:bg-background"><option value="all">Type</option><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-[37px] rounded-md border border-[#dfe5ec] bg-white px-3 text-sm text-[#243b63] dark:border-input dark:bg-background"><option value="all">Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-[37px] rounded-md border border-[#dfe5ec] bg-white px-3 text-sm text-[#243b63] dark:border-input dark:bg-background"><option value="recent">Sort By : Last 7 Days</option><option value="oldest">Sort By : Oldest</option></select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b border-[#e3e8ef] bg-[#fbfcfd] text-left text-sm font-medium text-[#092454] dark:border-border dark:bg-muted/50 dark:text-foreground">
                <th className="w-12 px-5 py-3"><input aria-label="Select all" type="checkbox" checked={visible.length > 0 && visible.every((row) => selectedIds.includes(row.id))} onChange={(event) => setSelectedIds(event.target.checked ? visible.map((row) => row.id) : [])} className="h-[18px] w-[18px] rounded border-[#dce4ed]" /></th>
                <th className="px-4 py-3">Name</th>
                {kind === 'coupon' && <th className="px-4 py-3">Code</th>}
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Limit</th>
                <th className="px-4 py-3">Valid</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.length ? (
                visible.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#e3e8ef] text-[#253a5c] last:border-0 hover:bg-[#fffaf7] dark:border-border dark:hover:bg-muted/30"
                  >
                    <td className="px-5 py-3"><input aria-label={`Select ${row.name}`} type="checkbox" checked={selectedIds.includes(row.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} className="h-[18px] w-[18px] rounded border-[#dce4ed]" /></td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    {kind === 'coupon' && (
                      <td className="px-4 py-3">
                        <span className="rounded bg-[#f0e9ff] px-2 py-1 text-xs font-medium text-[#7048e8] dark:bg-violet-500/10 dark:text-violet-300">
                          {row.code}
                        </span>
                      </td>
                    )}
                    <td className="max-w-[260px] truncate px-4 py-3 text-[#64748b] dark:text-muted-foreground">
                      {row.description || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#64748b]">
                      {row.valueType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                    </td>
                    <td className="px-4 py-3 text-[#64748b]">
                      {row.valueType === 'percentage'
                        ? `${Number(row.value)}%`
                        : formatCurrency(Number(row.value))}
                    </td>
                    <td className="px-4 py-3 text-[#64748b]">
                      {String(row.usageLimit ?? '∞').padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#64748b]">
                      {dateLabel(row.endsAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void toggleActive(row)}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-white ${effectiveActive(row) ? 'bg-[#43ba85]' : 'bg-red-500'}`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-white"
                        />
                        {effectiveActive(row) ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(row)}
                        className="grid h-[34px] w-[34px] place-items-center rounded-md border border-[#dfe5ec] bg-white text-[#27384f] hover:border-orange-400 hover:text-orange-600 dark:border-border dark:bg-background"
                        title={`Edit ${row.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" disabled={busyId === row.id} onClick={() => void toggleActive(row)} className="grid h-[34px] w-[34px] place-items-center rounded-md border border-[#dfe5ec] bg-white text-[#27384f] hover:border-red-300 hover:text-red-600 disabled:opacity-50 dark:border-border dark:bg-background" title={effectiveActive(row) ? `Deactivate ${row.name}` : `Activate ${row.name}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={kind === 'coupon' ? 10 : 9}
                    className="h-56 text-center"
                  >
                    <FileText className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                    <p className="font-medium">
                      No {text.title.toLowerCase()} found
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create your first {text.singular.toLowerCase()} to get
                      started.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span>Rows Per Page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>Entries</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              className="grid h-8 w-8 place-items-center disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-orange-600 px-2 text-xs font-semibold text-white">
              {page}
            </span>
            <button
              disabled={page === pages}
              onClick={() => setPage((value) => value + 1)}
              className="grid h-8 w-8 place-items-center disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </section>
      {editing && (
        <PromotionEditor
          kind={kind}
          record={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(record) => {
            setRows((current) =>
              editing === 'new'
                ? [...current, record]
                : current.map((item) => (item.id === record.id ? record : item))
            );
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PromotionEditor({
  kind,
  record,
  onClose,
  onSaved,
}: {
  kind: Kind;
  record: PromotionRecord | null;
  onClose: () => void;
  onSaved: (record: PromotionRecord) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => {
    const defaultStart = new Date();
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    return {
      name: record?.name ?? '',
      code: record?.code ?? '',
      description: record?.description ?? '',
      valueType: (record?.valueType ?? 'percentage') as 'percentage' | 'fixed',
      value: record?.value ?? '',
      minimumSpend: record?.minimumSpend ?? '0',
      maximumDiscount: record?.maximumDiscount ?? '',
      usageLimit: record?.usageLimit?.toString() ?? '',
      startsAt: dateInput(record?.startsAt ?? defaultStart),
      endsAt: dateInput(record?.endsAt ?? defaultEnd),
      isActive: record?.isActive ?? true,
    };
  });
  const update = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    try {
      const input: PromotionInput = {
        name: form.name,
        code: form.code,
        description: form.description,
        kind,
        valueType: form.valueType,
        value: Number(form.value),
        minimumSpend: Number(form.minimumSpend),
        maximumDiscount: form.maximumDiscount
          ? Number(form.maximumDiscount)
          : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        startsAt: new Date(`${form.startsAt}T00:00:00`),
        endsAt: new Date(`${form.endsAt}T23:59:59`),
        isActive: form.isActive,
      };
      let id = record?.id;
      if (record) await updatePromotion(record.id, input);
      else id = (await createPromotion(input)).id;
      onSaved({
        ...(record ?? {
          organizationId: '',
          createdBy: null,
          createdAt: new Date(),
          usedCount: 0,
        }),
        id: id!,
        name: input.name,
        code: input.code ? input.code.toUpperCase().replace(/\s+/g, '') : null,
        description: input.description || null,
        kind,
        valueType: input.valueType,
        value: String(input.value),
        minimumSpend: String(input.minimumSpend),
        maximumDiscount: input.maximumDiscount
          ? String(input.maximumDiscount)
          : null,
        usageLimit: input.usageLimit ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        isActive: input.isActive,
        updatedAt: new Date(),
      });
      notify.success(`${copy[kind].singular} saved`);
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Could not save promotion'
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-border bg-background shadow-2xl">
        <header className="flex h-14 items-center justify-between border-b border-border px-5">
          <h2 className="text-lg font-semibold">
            {record ? 'Edit' : 'Add'} {copy[kind].singular}
          </h2>
          <button
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Name">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </Field>
          {kind === 'coupon' && (
            <Field label="Code">
              <input
                value={form.code}
                onChange={(e) => update('code', e.target.value.toUpperCase())}
                required
              />
            </Field>
          )}
          <Field label="Value type">
            <select
              value={form.valueType}
              onChange={(e) => update('valueType', e.target.value)}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </Field>
          <Field label="Value">
            <input
              type="number"
              min="0.01"
              max={form.valueType === 'percentage' ? 100 : undefined}
              value={form.value}
              onChange={(e) => update('value', e.target.value)}
              required
            />
          </Field>
          <Field label="Minimum spend">
            <input
              type="number"
              min="0"
              value={form.minimumSpend}
              onChange={(e) => update('minimumSpend', e.target.value)}
            />
          </Field>
          <Field label="Maximum discount">
            <input
              type="number"
              min="0"
              value={form.maximumDiscount}
              onChange={(e) => update('maximumDiscount', e.target.value)}
              placeholder="No limit"
            />
          </Field>
          <Field label="Usage limit">
            <input
              type="number"
              min="1"
              value={form.usageLimit}
              onChange={(e) => update('usageLimit', e.target.value)}
              placeholder="Unlimited"
            />
          </Field>
          <Field label="Starts">
            <input
              type="date"
              value={form.startsAt}
              onChange={(e) => update('startsAt', e.target.value)}
              required
            />
          </Field>
          <Field label="Ends">
            <input
              type="date"
              value={form.endsAt}
              onChange={(e) => update('endsAt', e.target.value)}
              required
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => update('isActive', e.target.checked)}
              className="h-4 w-4 accent-orange-600"
            />
            <Check className="h-4 w-4 text-emerald-600" />
            Active and available
          </label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <button
            onClick={onClose}
            className="h-10 rounded-md border border-border bg-background px-4 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="h-10 rounded-md bg-orange-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Save ${copy[kind].singular}`}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      <span className="mb-2 block">{label}</span>
      <span className="block [&_input]:h-10 [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-input [&_input]:bg-background [&_input]:px-3 [&_select]:h-10 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-input [&_select]:bg-background [&_select]:px-3 [&_textarea]:w-full [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:border-input [&_textarea]:bg-background [&_textarea]:p-3">
        {children}
      </span>
    </label>
  );
}
function effectiveActive(row: PromotionRecord) {
  const now = Date.now();
  return (
    row.isActive &&
    new Date(row.startsAt).getTime() <= now &&
    new Date(row.endsAt).getTime() >= now &&
    (row.usageLimit == null || row.usedCount < row.usageLimit)
  );
}
function dateLabel(value: Date | string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
function dateInput(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
