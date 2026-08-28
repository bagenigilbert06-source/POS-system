'use client'

import { useState } from 'react'
import { archiveProductPackage, saveProductPackage } from '@/app/actions/products'
import type { ProductPackage } from '@/lib/db/schema'
import { formatCurrency } from '@/lib/utils'
import { PackagePlus, Trash2 } from 'lucide-react'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'
import { notify } from '@/lib/notify'

export function ProductPackagesManager({ productId, initialPackages, pharmacyMode = false, baseUnitLabel = 'bottle' }: { productId: string; initialPackages: ProductPackage[]; pharmacyMode?: boolean; baseUnitLabel?: string }) {
  const [packages, setPackages] = useState(initialPackages)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', packageType: (pharmacyMode ? 'custom' : 'case') as 'six_pack' | 'twelve_pack' | 'case' | 'custom', barcode: '', sellingPrice: '', baseUnitQuantity: pharmacyMode ? '1' : '12', etimsItemCode: '', etimsUnitCode: '' })
  const submit = async () => {
    setSaving(true)
    try {
      const saved = await saveProductPackage({ productId, name: form.name, packageType: form.packageType, barcode: form.barcode || undefined, sellingPrice: Number(form.sellingPrice), baseUnitQuantity: Number(form.baseUnitQuantity), etimsItemCode: form.etimsItemCode || undefined, etimsUnitCode: form.etimsUnitCode || undefined })
      setPackages((current) => [...current.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.baseUnitQuantity - b.baseUnitQuantity))
      setForm({ name: '', packageType: pharmacyMode ? 'custom' : 'case', barcode: '', sellingPrice: '', baseUnitQuantity: pharmacyMode ? '1' : '12', etimsItemCode: '', etimsUnitCode: '' })
      notify.success('Selling package added')
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not save package') }
    finally { setSaving(false) }
  }
  return <section className="rounded-xl border bg-white p-5 shadow-sm dark:bg-[#141414]">
    <div><h2 className="text-base font-bold">{pharmacyMode ? 'Medicine pack prices' : 'Bottle, pack and case prices'}</h2><p className="mt-1 text-xs text-muted-foreground">{pharmacyMode ? `Configure sellable packs and how many base ${baseUnitLabel} units each pack deducts.` : 'Stock stays in base bottles. Each package deducts its configured bottle quantity.'}</p></div>
    {packages.length > 0 && <div className="mt-4 divide-y rounded-lg border">{packages.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-3 py-3 text-sm"><div><p className="font-semibold">{item.name} · {item.baseUnitQuantity} {pharmacyMode ? baseUnitLabel : 'bottles'}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(item.sellingPrice)}{item.barcode ? ` · ${item.barcode}` : ''}</p></div><button type="button" aria-label={`Archive ${item.name}`} onClick={async () => { try { await archiveProductPackage(item.id); setPackages((current) => current.filter((entry) => entry.id !== item.id)); notify.success('Package archived') } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not archive package') } }} className="rounded-md border p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
    <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold">Package name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={pharmacyMode ? 'Box of 20' : 'Case of 12'} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="text-xs font-semibold">Type<select value={form.packageType} onChange={(e) => { const type=e.target.value as typeof form.packageType; const quantity=type==='six_pack'?'6':type==='twelve_pack'?'12':form.baseUnitQuantity; setForm({ ...form, packageType:type, baseUnitQuantity:quantity }) }} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">{!pharmacyMode && <><option value="six_pack">Six-pack</option><option value="twelve_pack">Twelve-pack</option><option value="case">Case</option></>}<option value="custom">{pharmacyMode ? 'Medicine pack' : 'Custom'}</option></select></label>
      <label className="text-xs font-semibold">{pharmacyMode ? `Base ${baseUnitLabel} units per pack` : 'Bottles per package'}<input type="number" min={pharmacyMode ? 1 : 2} value={form.baseUnitQuantity} onChange={(e) => setForm({ ...form, baseUnitQuantity: e.target.value })} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="text-xs font-semibold">Selling price<input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="text-xs font-semibold">Package barcode<input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="text-xs font-semibold">eTIMS item code<input value={form.etimsItemCode} onChange={(e) => setForm({ ...form, etimsItemCode: e.target.value })} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <label className="text-xs font-semibold">eTIMS unit code<input value={form.etimsUnitCode} onChange={(e) => setForm({ ...form, etimsUnitCode: e.target.value })} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" /></label>
      <button type="button" disabled={saving || !form.name || !form.sellingPrice} onClick={() => void submit()} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}Add package</button>
    </div>
  </section>
}
