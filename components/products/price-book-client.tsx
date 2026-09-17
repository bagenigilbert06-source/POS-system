'use client';

import { useMemo, useState } from 'react';
import { updatePriceBook } from '@/app/actions/price-book';
import { notify } from '@/lib/notify';

type Row = { id: string; kind: 'product' | 'package'; name: string; unitLabel: string; sku: string | null; barcode: string | null; costPrice: string | null; retailPrice: string; wholesalePrice: string | null; categoryId: string | null; categoryName: string | null };

export function PriceBookClient({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const categories = useMemo(() => Array.from(new Set(rows.map((row) => row.categoryName).filter(Boolean))) as string[], [rows]);
  const missingCount = rows.filter((row) => row.wholesalePrice === null || row.wholesalePrice === '').length;
  const visible = rows.filter((row) => (category === 'all' || row.categoryName === category) && (!missing || row.wholesalePrice === null || row.wholesalePrice === '') && (!search || [row.name, row.unitLabel, row.sku ?? '', row.barcode ?? ''].some((value) => value.toLowerCase().includes(search.toLowerCase()))));
  const setPrice = (id: string, field: 'retailPrice' | 'wholesalePrice', value: string) => setRows((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  const save = async () => {
    setSaving(true);
    try {
      const result = await updatePriceBook(rows.map((row) => ({ id: row.id, kind: row.kind, retailPrice: Number(row.retailPrice), wholesalePrice: row.wholesalePrice === null || row.wholesalePrice === '' ? null : Number(row.wholesalePrice) })));
      notify.success(`${result.updated} prices saved`);
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not save prices'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      <input aria-label="Search products" placeholder="Search products, package, SKU or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 min-w-72 flex-1 rounded-md border bg-background px-3 text-sm"/>
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
      <button type="button" onClick={() => setMissing((value) => !value)} className="h-10 rounded-md border px-3 text-sm">{missing ? 'Missing wholesale only' : `All prices · ${missingCount} missing wholesale`}</button>
      <button disabled={saving} onClick={save} className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">{saving ? 'Saving…' : 'Save prices'}</button>
    </div>
    <div className="max-h-[65vh] overflow-auto rounded-xl border bg-card"><table className="w-full min-w-[760px] text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-left">Product / selling unit</th><th className="p-3 text-right">Cost (KES)</th><th className="p-3 text-right">Retail (KES)</th><th className="p-3 text-right">Wholesale (KES)</th></tr></thead><tbody>{visible.map((row) => <tr key={`${row.kind}-${row.id}`} className="border-t"><td className="p-3"><div className="font-medium">{row.name}</div><div className="text-xs font-medium text-foreground/80">{row.unitLabel} · {row.kind === 'package' ? 'Package / variant' : 'Base unit'}</div><div className="text-xs text-muted-foreground">{row.sku || row.barcode || 'No identifier'} · {row.categoryName || 'Uncategorized'}</div></td><td className="p-3 text-right tabular-nums">{row.kind === 'package' ? '—' : Number(row.costPrice).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td><td className="p-3"><input aria-label={`${row.name} ${row.unitLabel} retail price`} type="number" min="0" step="0.01" value={row.retailPrice} onChange={(e) => setPrice(row.id, 'retailPrice', e.target.value)} className="ml-auto block h-9 w-32 rounded border px-2 text-right tabular-nums"/></td><td className="p-3"><input aria-label={`${row.name} ${row.unitLabel} wholesale price`} type="number" min="0" step="0.01" placeholder="Not configured" value={row.wholesalePrice ?? ''} onChange={(e) => setPrice(row.id, 'wholesalePrice', e.target.value)} className="ml-auto block h-9 w-32 rounded border px-2 text-right tabular-nums"/></td></tr>)}</tbody></table></div>
  </div>;
}
