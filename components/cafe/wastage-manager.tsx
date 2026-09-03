'use client';

import { useState, useTransition } from 'react';
import { getCafeWastageData, recordCafeWastage } from '@/app/actions/cafe';
import { formatDateTime } from '@/lib/utils';
import { notify } from '@/lib/notify';

type Data = Awaited<ReturnType<typeof getCafeWastageData>>;
const reasons = ['spoilage', 'expired', 'preparation_waste', 'dropped_spilled', 'damaged', 'staff_meal', 'other'] as const;

export function WastageManager({ initialData, canRecord }: { initialData: Data; canRecord: boolean }) {
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ branchId: initialData.branches[0]?.id ?? '', productId: '', quantity: '1', unit: '', reasonType: 'spoilage' as typeof reasons[number], notes: '' });
  const product = data.products.find((item) => item.id === form.productId);
  const submit = () => startTransition(async () => {
    try {
      await recordCafeWastage({ ...form, quantity: Number(form.quantity), unit: form.unit || product?.unit || 'pieces' });
      setData(await getCafeWastageData());
      setForm((current) => ({ ...current, productId: '', quantity: '1', unit: '', notes: '' }));
      notify.success('Wastage recorded in the inventory ledger');
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not record wastage'); }
  });
  const field = 'h-10 w-full rounded-lg border border-[#d0d5dd] bg-white px-3 text-sm outline-none focus:border-[#f9b21d] focus:ring-2 focus:ring-[#f9b21d]/20 dark:border-white/10 dark:bg-[#151515]';
  return <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
    {canRecord && <section className="h-fit rounded-xl border border-[#e4e7ec] bg-white p-5 dark:border-white/10 dark:bg-[#171717]">
      <h2 className="text-base font-bold">Record wastage</h2><p className="mt-1 text-xs text-[#667085] dark:text-[#a8a8a8]">Quantities are converted to the ingredient’s base unit and posted once.</p>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-xs font-semibold">Branch<select className={field} value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>{data.branches.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-semibold">Ingredient or item<select className={field} value={form.productId} onChange={(e) => { const next = data.products.find((row) => row.id === e.target.value); setForm({ ...form, productId: e.target.value, unit: next?.unit ?? '' }); }}><option value="">Choose item</option>{data.products.map((row) => <option key={row.id} value={row.id}>{row.name} ({row.unit})</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-xs font-semibold">Quantity<input className={field} type="number" min="0.001" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label><label className="grid gap-1.5 text-xs font-semibold">Unit<input className={field} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder={product?.unit ?? 'ml, g, pieces'} /></label></div>
        <label className="grid gap-1.5 text-xs font-semibold">Reason<select className={field} value={form.reasonType} onChange={(e) => setForm({ ...form, reasonType: e.target.value as typeof reasons[number] })}>{reasons.map((reason) => <option key={reason} value={reason}>{reason.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="grid gap-1.5 text-xs font-semibold">Notes<textarea rows={3} maxLength={500} className={`${field} h-auto py-2`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <button type="button" disabled={pending || !form.branchId || !form.productId || !(Number(form.quantity) > 0)} onClick={submit} className="h-11 rounded-lg bg-[#f9b21d] text-sm font-extrabold text-[#241d00] disabled:opacity-50">{pending ? 'Recording…' : 'Record wastage'}</button>
      </div>
    </section>}
    <section className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white dark:border-white/10 dark:bg-[#171717]">
      <div className="border-b border-[#e4e7ec] px-5 py-4 dark:border-white/10"><h2 className="font-bold">Wastage history</h2><p className="mt-1 text-xs text-[#667085] dark:text-[#a8a8a8]">Recent spoilage, expiry and preparation losses.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-[#f8fafc] text-[11px] uppercase tracking-wide text-[#667085] dark:bg-white/5"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Quantity</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Notes</th></tr></thead><tbody className="divide-y divide-[#eef0f3] dark:divide-white/10">{data.rows.map(({ wastage, productName, staffName }) => <tr key={wastage.id}><td className="whitespace-nowrap px-4 py-3 text-xs">{formatDateTime(wastage.createdAt)}</td><td className="px-4 py-3 font-semibold">{productName}</td><td className="px-4 py-3 tabular-nums">{Number(wastage.enteredQuantity)} {wastage.enteredUnit}</td><td className="px-4 py-3 capitalize">{wastage.reasonType.replaceAll('_', ' ')}</td><td className="px-4 py-3">{staffName}</td><td className="max-w-[260px] truncate px-4 py-3 text-[#667085] dark:text-[#a8a8a8]">{wastage.notes || '—'}</td></tr>)}{!data.rows.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-[#667085]">No wastage has been recorded.</td></tr>}</tbody></table></div>
    </section>
  </div>;
}
