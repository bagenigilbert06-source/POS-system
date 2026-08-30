'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  searchCouponEligibleCustomers,
  sendCouponToCustomers,
  sendDiscountCampaignToCustomers,
  sendBonusCampaignToCustomers,
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
  bonusValidityDays: number | null;
  usageLimit: number | null;
  usedCount: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  lifecycleStatus?: string;
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
    description: 'Create and manage customer discount codes.',
    singular: 'Coupon',
  },
  discount: {
    title: 'Discounts',
    description: 'Create and manage automatic sale discounts.',
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
  const [sendCoupon, setSendCoupon] = useState<PromotionRecord | null>(null);
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
            <p className="mt-1 text-sm text-[#667792] dark:text-muted-foreground">{kind === 'bonus' ? 'Create and manage promotional customer credit.' : `Manage Your ${text.title}`}</p>
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
            {kind === 'bonus' ? 'Create Bonus Campaign' : kind === 'discount' ? 'Create Discount Campaign' : 'Create Coupon'}
          </button>
        </div>
      </header>
      <section className="overflow-hidden rounded-[10px] border border-[#dfe6ee] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)] dark:border-border dark:bg-card">
        {kind === 'bonus' && <div className="border-b border-[#e3e8ef] px-5 py-4 dark:border-border"><h2 className="text-base font-semibold text-[#092454] dark:text-white">Bonus campaigns</h2><p className="mt-1 text-xs text-[#667792] dark:text-muted-foreground">Manage campaigns that award promotional customer credit.</p></div>}
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
            <select value={valueType} onChange={(event) => { setValueType(event.target.value); setPage(1); }} className="h-[37px] rounded-md border border-[#dfe5ec] bg-white px-3 text-sm text-[#243b63] dark:border-input dark:bg-background dark:text-slate-200"><option value="all">Type</option><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-[37px] rounded-md border border-[#dfe5ec] bg-white px-3 text-sm text-[#243b63] dark:border-input dark:bg-background dark:text-slate-200"><option value="all">Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-[37px] rounded-md border border-[#dfe5ec] bg-white px-3 text-sm text-[#243b63] dark:border-input dark:bg-background dark:text-slate-200"><option value="recent">Sort By : Last 7 Days</option><option value="oldest">Sort By : Oldest</option></select>
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
                <th className="px-4 py-3">{kind === 'bonus' ? 'Reward' : 'Discount'}</th>
                {kind === 'bonus' && <th className="px-4 py-3">Bonus validity</th>}
                <th className="px-4 py-3">{kind === 'bonus' ? 'Awards used / limit' : 'Limit'}</th>
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
                    className="border-b border-[#e3e8ef] text-[#253a5c] last:border-0 hover:bg-[#fffaf7] dark:border-border dark:text-slate-200 dark:hover:bg-muted/30"
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
                    <td className="px-4 py-3 text-[#64748b] dark:text-muted-foreground">
                      {row.valueType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                    </td>
                    {kind === 'bonus' && <td className="px-4 py-3 text-[#64748b] dark:text-muted-foreground">{row.bonusValidityDays ? `${row.bonusValidityDays} days` : 'No expiry'}</td>}
                    <td className="px-4 py-3 text-[#64748b] dark:text-muted-foreground">
                      {kind === 'bonus' ? (row.valueType === 'percentage' ? `${Number(row.value)}% · Max ${formatCurrency(Number(row.maximumDiscount ?? 0))}` : formatCurrency(Number(row.value))) : (row.valueType === 'percentage' ? `${Number(row.value)}%` : formatCurrency(Number(row.value)))}
                    </td>
                    <td className="px-4 py-3 text-[#64748b] dark:text-muted-foreground">
                      {row.usageLimit == null ? `${row.usedCount} / ∞` : `${row.usedCount} / ${row.usageLimit}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#64748b] dark:text-muted-foreground">
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
                      {(kind === 'coupon' || kind === 'discount' || kind === 'bonus') && effectiveActive(row) && <button type="button" onClick={() => setSendCoupon(row)} className="grid h-[34px] w-[34px] place-items-center rounded-md border" title={kind === 'coupon' ? 'Send coupon' : 'Send promotion'}>✉</button>}
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
      {sendCoupon && <SendCouponDialog coupon={sendCoupon} kind={kind === 'discount' ? 'discount' : kind === 'bonus' ? 'bonus' : 'coupon'} onClose={() => setSendCoupon(null)} />}
    </div>
  );
}

type CouponCustomer = { id: string; name: string; email: string | null; phone?: string | null };

function SendCouponDialog({ coupon, kind, onClose }: { coupon: PromotionRecord; kind: 'coupon' | 'discount' | 'bonus'; onClose: () => void }) {
  const [step, setStep] = useState<'recipient' | 'preview' | 'success'>('recipient');
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CouponCustomer[]>([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [usageLimitReached, setUsageLimitReached] = useState(false);
  const [selected, setSelected] = useState<CouponCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sending) onClose();
      if (event.key === 'Enter' && step === 'recipient' && selected.length) setStep('preview');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, sending, selected, step]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchCouponEligibleCustomers({ couponId: coupon.id, kind, search, page: 1, pageSize: 20 }).then((result) => {
        if (!cancelled) { setCustomers(result.customers); setCustomerTotal(result.total); setUsageLimitReached(result.usageLimitReached); }
      }).catch(() => { if (!cancelled) setError('Could not load customers. Please try again.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [coupon.id, kind, search]);

  const value = Number(coupon.value || 0);
  const minimum = Number(coupon.minimumSpend || 0);
  const offer = kind === 'bonus' ? (coupon.valueType === 'percentage' ? `${value}% Bonus` : `${formatCurrency(value)} Bonus`) : coupon.valueType === 'percentage' ? `${value}% off` : `${formatCurrency(value)} off`;
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const validUntil = date.format(new Date(coupon.endsAt));
  const maskedPhone = (phone?: string | null) => phone ? `${phone.slice(0, 4)} *** ${phone.slice(-3)}` : '';

  const send = async () => {
    if (!selected.length) return;
    setSending(true); setError(null);
    try {
      const result = kind === 'discount'
        ? await sendDiscountCampaignToCustomers({ campaignId: coupon.id, customerIds: selected.map((customer) => customer.id) })
        : kind === 'bonus'
          ? await sendBonusCampaignToCustomers({ campaignId: coupon.id, customerIds: selected.map((customer) => customer.id) })
          : await sendCouponToCustomers({ couponId: coupon.id, customerIds: selected.map((customer) => customer.id) });
      setSendResult({ sent: result.sent, failed: result.failed });
      notify.success('Coupon emails processed');
      setStep('success');
    } catch {
      setError('Could not send coupon. Please try again.');
    } finally { setSending(false); }
  };

  return <div className="fixed inset-0 z-[90] grid place-items-center bg-transparent p-4" role="dialog" aria-modal="true" aria-labelledby="send-coupon-title">
    <div className="flex max-h-[min(720px,calc(100vh-2rem))] w-full max-w-[720px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
      <header className="flex items-start justify-between border-b border-border px-6 py-5">
        <div><h2 id="send-coupon-title" className="text-lg font-semibold">{kind === 'discount' ? 'Send promotion' : 'Send coupon'}</h2><p className="mt-1 text-sm text-muted-foreground">{kind === 'discount' ? 'Email this automatic discount offer to eligible customers.' : 'Send this coupon to a registered customer by email.'}</p></div>
        <button type="button" aria-label="Close" disabled={sending} onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"><X className="h-4 w-4" /></button>
      </header>
      <div className="space-y-5 overflow-y-auto px-6 py-5 [scrollbar-color:theme(colors.muted.foreground)_transparent] [scrollbar-width:thin]">
        <section className="rounded-lg border border-border bg-muted/30 p-4"><div className="flex items-start justify-between gap-3"><div>{kind === 'coupon' && <div className="font-mono text-sm font-bold tracking-wide">{coupon.code}</div>}<div className="mt-1 font-medium">{coupon.name}</div></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Active</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span>{kind === 'bonus' ? `Spend ${formatCurrency(minimum)} · Earn ${offer}` : offer}</span>{kind !== 'bonus' && <span>Min {formatCurrency(minimum)}</span>}{(kind === 'discount' || kind === 'bonus') && coupon.maximumDiscount && <span>Max {formatCurrency(Number(coupon.maximumDiscount))}</span>}{kind === 'bonus' && coupon.bonusValidityDays && <span>Valid {coupon.bonusValidityDays} days after earning</span>}{kind !== 'bonus' && <span>Valid until {validUntil}</span>}</div></section>
        <div className="flex items-center gap-3 text-xs font-medium"><span className={step === 'recipient' ? 'text-foreground' : 'text-muted-foreground'}>1&nbsp; Recipient</span><span className="h-px flex-1 bg-border" /><span className={step !== 'recipient' ? 'text-foreground' : 'text-muted-foreground'}>2&nbsp; Preview &amp; send</span></div>
        {step === 'recipient' && <section><div className="flex items-center justify-between"><div><h3 className="text-base font-semibold">Eligible customers</h3><p className="mt-1 text-sm text-muted-foreground">Select one or more registered customers with email.</p></div><span className="text-sm text-muted-foreground">{customerTotal}</span></div><div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers by name, email or phone..." className="h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" /></div>{usageLimitReached && <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Coupon usage limit reached.</p>}<div className="mt-3 flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={customers.length > 0 && customers.every((customer) => selected.some((item) => item.id === customer.id))} onChange={(event) => setSelected(event.target.checked ? [...selected.filter((item) => !customers.some((customer) => customer.id === item.id)), ...customers] : selected.filter((item) => !customers.some((customer) => customer.id === item.id)))} />Select this page</label><span className="text-muted-foreground">Selected: {selected.length}</span></div><div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">{loading && <p className="px-2 py-4 text-sm text-muted-foreground">Searching customers…</p>}{!loading && customers.length === 0 && <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{search.trim() ? 'No matching customers found.' : 'No eligible customers found.'}</p>}{customers.map((customer) => { const active = selected.some((item) => item.id === customer.id); return <button type="button" key={customer.id} onClick={() => { setSelected(active ? selected.filter((item) => item.id !== customer.id) : [...selected, customer]); setError(null); }} className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${active ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/20' : 'border-border hover:bg-muted/50'}`}><span className={`mt-0.5 grid h-4 w-4 place-items-center rounded border ${active ? 'border-orange-600 bg-orange-600 text-white' : 'border-muted-foreground/50'}`}>{active && <Check className="h-3 w-3" />}</span><span className="min-w-0"><span className="block font-medium">{customer.name}</span><span className="block truncate text-sm text-muted-foreground">{customer.email}</span>{customer.phone && <span className="block text-xs text-muted-foreground">{maskedPhone(customer.phone)}</span>}</span></button>; })}</div>{selected.length > 0 && <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900/50 dark:bg-orange-950/20"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected recipients</div><div className="mt-1 font-medium">{selected.length} customer{selected.length === 1 ? '' : 's'}</div><div className="text-sm text-muted-foreground">{selected.slice(0, 2).map((customer) => customer.name).join(', ')}{selected.length > 2 ? ` + ${selected.length - 2} more` : ''}</div></div>}{error && <p className="mt-3 text-sm text-red-600">{error}</p>}</section>}
        {step === 'preview' && selected.length > 0 && <section><button type="button" onClick={() => setStep('recipient')} disabled={sending} className="mb-4 text-sm font-medium text-orange-700 hover:underline">← Change recipients</button><h3 className="text-base font-semibold">Preview &amp; send</h3><div className="mt-2 text-sm"><span className="text-muted-foreground">Recipients</span><div className="font-medium">{selected.length} customer{selected.length === 1 ? '' : 's'}</div><div className="text-muted-foreground">{selected.slice(0, 3).map((customer) => customer.name).join(', ')}{selected.length > 3 ? ` + ${selected.length - 3} more` : ''}</div></div><div className="mt-4 rounded-lg border border-border bg-muted/20 p-5"><div className="text-sm font-medium">{kind === 'bonus' ? 'Bonus promotion' : 'Promotion email'}</div><div className="mt-5 text-center"><div className="text-lg font-semibold">{kind === 'bonus' ? 'Earn Bonus on your next purchase' : kind === 'discount' ? 'A special offer for you' : 'Your coupon is ready'}</div>{kind === 'coupon' && <div className="mx-auto mt-4 w-fit rounded-md border border-dashed border-orange-400 bg-orange-50 px-5 py-3 font-mono text-lg font-bold tracking-widest text-orange-700 dark:bg-orange-950/20">{coupon.code}</div>}<div className="mt-4 text-base font-medium">{kind === 'bonus' ? `Spend at least ${formatCurrency(minimum)} and earn ${offer}` : `${offer} on your next eligible purchase`}</div><div className="mt-2 text-sm text-muted-foreground">Minimum spend: {formatCurrency(minimum)}{kind === 'discount' && coupon.maximumDiscount ? <><br />Maximum discount: {formatCurrency(Number(coupon.maximumDiscount))}</> : null}{kind === 'bonus' && coupon.maximumDiscount ? <><br />Maximum Bonus: {formatCurrency(Number(coupon.maximumDiscount))}</> : null}{kind === 'bonus' && coupon.bonusValidityDays ? <><br />Bonus valid {coupon.bonusValidityDays} days after earning</> : <><br />Valid until: {validUntil}</>}</div></div><p className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground">{kind === 'bonus' ? 'No coupon code required. You pay normally; Bonus is credited after successful completion for use on a future eligible purchase.' : kind === 'discount' ? 'No coupon code required. The discount applies automatically at checkout when the purchase qualifies.' : 'Each selected customer will receive this email.'}</p></div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}</section>}
        {step === 'success' && selected.length > 0 && <section className="py-8 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-6 w-6" /></div><h3 className="mt-4 text-lg font-semibold">{kind === 'bonus' ? 'Bonus promotion emails processed' : kind === 'discount' ? 'Promotion emails processed' : 'Coupon emails processed'}</h3><p className="mt-1 text-sm text-muted-foreground">{kind === 'bonus' || kind === 'discount' ? coupon.name : coupon.code} delivery results</p><div className="mt-5 flex justify-center gap-8"><div><div className="text-2xl font-semibold text-emerald-600">{sendResult?.sent ?? 0}</div><div className="text-xs text-muted-foreground">Sent</div></div><div><div className="text-2xl font-semibold text-red-600">{sendResult?.failed ?? 0}</div><div className="text-xs text-muted-foreground">Failed</div></div></div><p className="mt-4 text-xs text-muted-foreground">Selected: {selected.length}</p></section>}
      </div>
      <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">{step === 'success' ? <button type="button" onClick={onClose} className="rounded-md bg-orange-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-700">Done</button> : <><button type="button" onClick={step === 'preview' ? () => setStep('recipient') : onClose} disabled={sending} className="rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50">{step === 'preview' ? 'Back' : 'Cancel'}</button><button type="button" onClick={step === 'recipient' ? () => setStep('preview') : send} disabled={sending || !selected.length} className="rounded-md bg-orange-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">{sending ? 'Sending…' : step === 'recipient' ? 'Continue' : `Send to ${selected.length}`}</button></>}</footer>
    </div>
  </div>;
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
      bonusValidityDays: record?.bonusValidityDays?.toString() ?? '30',
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
        bonusValidityDays: kind === 'bonus' && form.bonusValidityDays !== 'none' ? Number(form.bonusValidityDays) : null,
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
        bonusValidityDays: input.bonusValidityDays ?? null,
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
      className="fixed inset-0 z-[80] grid place-items-center bg-transparent p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="flex max-h-[84vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] dark:border-border dark:bg-background">
        <header className="flex h-14 items-center justify-between border-b border-border px-5">
          <h2 className="text-lg font-semibold">
            {kind === 'bonus' ? (record ? 'Edit Bonus Campaign' : 'Create Bonus Campaign') : `${record ? 'Edit' : 'Add'} ${copy[kind].singular}`}
          </h2>
          <button
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="grid min-h-0 flex-1 overflow-y-auto gap-4 p-5 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] dark:[scrollbar-color:#475569_transparent] sm:grid-cols-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent">
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
          <Field label={kind === 'bonus' ? 'Reward type' : 'Value type'}>
            <select
              value={form.valueType}
              onChange={(e) => update('valueType', e.target.value)}
            >
              <option value="percentage">{kind === 'bonus' ? 'Percentage Bonus' : 'Percentage'}</option>
              <option value="fixed">{kind === 'bonus' ? 'Fixed Bonus' : 'Fixed amount'}</option>
            </select>
          </Field>
          <Field label={kind === 'bonus' ? (form.valueType === 'percentage' ? 'Bonus percentage (%)' : 'Bonus amount (KES)') : 'Value'}>
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
          <Field label={kind === 'bonus' ? 'Maximum Bonus per qualifying sale (KES)' : 'Maximum discount'}>
            <input
              type="number"
              min="0"
              value={form.maximumDiscount}
              onChange={(e) => update('maximumDiscount', e.target.value)}
              placeholder="No limit"
            />
          </Field>
          <Field label={kind === 'bonus' ? `Total award limit${record ? ` (${record.usedCount} used)` : ''}` : 'Usage limit'}>
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
          {kind === 'bonus' && <Field label="Bonus validity"><select value={form.bonusValidityDays} onChange={(e) => update('bonusValidityDays', e.target.value)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option><option value="none">No expiry</option></select></Field>}
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
          {kind === 'bonus' && <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-slate-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"><p className="font-semibold">Campaign preview</p><p className="mt-1">Spend {formatCurrency(Number(form.minimumSpend) || 0)} · Earn {form.valueType === 'percentage' ? `${form.value || 0}% Bonus` : `${formatCurrency(Number(form.value) || 0)} Bonus`}</p>{form.valueType === 'percentage' && form.maximumDiscount && <p>Maximum {formatCurrency(Number(form.maximumDiscount))}</p>}<p>Campaign period: {form.startsAt} – {form.endsAt}</p><p>Customer pays normally; Bonus is credited after successful completion.</p></div>}
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
