'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { CheckCircle2, Eye, PackagePlus, Search, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { confirmStockIntake } from '@/app/actions/stock-intake'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils/format'

type Product = { id: string; name: string; sku: string | null; barcode: string | null; unit: string; buyingPrice: string; trackingMode: string }
type Package = { id: string; productId: string; name: string; baseUnitQuantity: number; barcode: string | null }
type Balance = { productId: string; branchId: string; onHand: string; reserved: string; unavailable: string }
type Intake = { id: string; intakeNo: string; externalReference: string | null; sourceName: string | null; sourceType: string; notes: string | null; status: string; receivedAt: Date; createdBy: string; branchId: string }
type IntakeItem = { id: string; intakeId: string; productId: string; productName: string; enteredQuantity: number; enteredUnit: string; baseQuantity: number; unitCost: string; totalCost: string }
type Line = { productId: string; packageId?: string; quantity: number; unitCost: string }

export function StockIntakeManager({
  intakes, items, branches, products, packages, balances, staff, currency, canReceive,
}: {
  intakes: Intake[]; items: IntakeItem[]; branches: { id: string; name: string; isMain: boolean }[]; products: Product[]; packages: Package[]; balances: Balance[]; staff: { id: string; name: string }[]; currency: string; canReceive: boolean
}) {
  const router = useRouter()
  const idempotencyKey = useRef('')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [staffFilter, setStaffFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Intake | null>(null)
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [productSearch, setProductSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [reference, setReference] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceType, setSourceType] = useState('new_stock')
  const [notes, setNotes] = useState('')
  const [pending, startTransition] = useTransition()

  const productsById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products])
  const packagesByProduct = useMemo(() => new Map(products.map((item) => [item.id, packages.filter((entry) => entry.productId === item.id)])), [products, packages])
  const itemsByIntake = useMemo(() => new Map(intakes.map((intake) => [intake.id, items.filter((item) => item.intakeId === intake.id)])), [intakes, items])
  const staffById = useMemo(() => new Map(staff.map((item) => [item.id, item.name])), [staff])
  const filtered = intakes.filter((intake) => {
    const text = `${intake.intakeNo} ${intake.externalReference ?? ''} ${(itemsByIntake.get(intake.id) ?? []).map((item) => item.productName).join(' ')}`.toLowerCase()
    const day = new Date(intake.receivedAt).toISOString().slice(0, 10)
    return (branchFilter === 'all' || intake.branchId === branchFilter) && (staffFilter === 'all' || intake.createdBy === staffFilter) && (!fromDate || day >= fromDate) && (!toDate || day <= toDate) && (!query || text.includes(query.toLowerCase()))
  })
  const pageSize = 20
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleIntakes = filtered.slice((Math.min(page, pageCount) - 1) * pageSize, Math.min(page, pageCount) * pageSize)
  const matchingProducts = products.filter((product) => `${product.name} ${product.sku ?? ''} ${product.barcode ?? ''}`.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8)
  const lineDetails = lines.map((line) => {
    const product = productsById.get(line.productId)!
    const selectedPackage = line.packageId ? packages.find((entry) => entry.id === line.packageId) : undefined
    const conversion = selectedPackage?.baseUnitQuantity ?? 1
    const cost = line.unitCost === '' ? Number(product.buyingPrice) * conversion : Number(line.unitCost)
    return { ...line, product, selectedPackage, conversion, cost, baseQuantity: line.quantity * conversion, total: line.quantity * cost }
  })
  const totalValue = lineDetails.reduce((sum, line) => sum + line.total, 0)

  const addProduct = (product: Product, packageId?: string) => {
    if (product.trackingMode !== 'none') { notify.error('Batch or serial-tracked products must use the traceable receipt workflow for now.'); return }
    setProductSearch('')
    const matchingLine = lines.find((line) => line.productId === product.id && line.packageId === packageId)
    if (matchingLine) {
      updateLine(product.id, { quantity: matchingLine.quantity + 1 })
      return
    }
    if (lines.some((line) => line.productId === product.id)) {
      notify.error(`Use one receiving unit per intake line for ${product.name}.`)
      return
    }
    setLines((current) => [...current, { productId: product.id, packageId, quantity: 1, unitCost: '' }])
  }
  const scanOrSearch = () => {
    const barcode = productSearch.trim()
    if (!barcode) return
    const productMatches = products.filter((product) => product.barcode === barcode).map((product) => ({ product, packageId: undefined as string | undefined }))
    const packageMatches = packages.filter((item) => item.barcode === barcode).map((item) => ({ product: productsById.get(item.productId), packageId: item.id })).filter((item): item is { product: Product; packageId: string } => Boolean(item.product))
    const matches = [...productMatches, ...packageMatches]
    if (!matches.length) { notify.error('Product not found for this barcode.'); return }
    if (matches.length > 1) { notify.error('This barcode is assigned to multiple products. Fix the barcode configuration first.'); return }
    addProduct(matches[0].product, matches[0].packageId)
  }
  const updateLine = (productId: string, patch: Partial<Line>) => setLines((current) => current.map((line) => line.productId === productId ? { ...line, ...patch } : line))
  const reset = () => { setLines([]); setReference(''); setSourceName(''); setSourceType('new_stock'); setNotes(''); setProductSearch(''); setBranchId(branches[0]?.id ?? ''); idempotencyKey.current = '' }
  const submit = () => startTransition(async () => {
    try {
      const result = await confirmStockIntake({ branchId, externalReference: reference || undefined, sourceName: sourceName || undefined, sourceType: sourceType as 'new_stock' | 'opening_stock' | 'other', notes: notes || undefined, receivedAt: new Date(), idempotencyKey: idempotencyKey.current || (idempotencyKey.current = crypto.randomUUID()), items: lines.map((line) => ({ productId: line.productId, packageId: line.packageId, quantity: line.quantity, unitCost: line.unitCost === '' ? undefined : Number(line.unitCost) })) })
      notify.success(result.duplicate ? `Intake ${result.intakeNo} was already confirmed.` : `Stock intake ${result.intakeNo} confirmed.`)
      setOpen(false); reset(); router.refresh()
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not confirm stock intake') }
  })

  return <>
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search reference or stock item" /></div>
      <div className="flex flex-wrap gap-2"><input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1) }} className="h-10 rounded-lg border bg-background px-3 text-sm" aria-label="From date" /><input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1) }} className="h-10 rounded-lg border bg-background px-3 text-sm" aria-label="To date" /><select value={branchFilter} onChange={(event) => { setBranchFilter(event.target.value); setPage(1) }} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All locations</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><select value={staffFilter} onChange={(event) => { setStaffFilter(event.target.value); setPage(1) }} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="all">All staff</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>{canReceive && <Button onClick={() => { idempotencyKey.current = crypto.randomUUID(); setOpen(true) }} className="gap-2"><PackagePlus className="h-4 w-4" />New Stock Intake</Button>}</div>
    </div>
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4"><h2 className="text-base font-bold">Intake history</h2><p className="mt-1 text-xs text-muted-foreground">Confirmed deliveries only. Inventory changes are permanent and auditable.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-muted/30 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><tr>{['Reference','Date / time','Location','Items','Total units','Stock value','Recorded by','Status',''].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{visibleIntakes.map((intake) => { const rows = itemsByIntake.get(intake.id) ?? []; const branch = branches.find((item) => item.id === intake.branchId); return <tr key={intake.id} className="hover:bg-muted/20"><td className="px-4 py-3 font-semibold">{intake.intakeNo}<span className="mt-0.5 block text-xs font-normal text-muted-foreground">{intake.externalReference ?? 'No delivery reference'}</span></td><td className="px-4 py-3 whitespace-nowrap text-xs">{formatDateTime(new Date(intake.receivedAt))}</td><td className="px-4 py-3">{branch?.name ?? 'Unknown location'}</td><td className="px-4 py-3">{rows.length}</td><td className="px-4 py-3 tabular-nums">{formatNumber(rows.reduce((sum, item) => sum + item.baseQuantity, 0))}</td><td className="px-4 py-3 font-semibold tabular-nums">{formatCurrency(rows.reduce((sum, item) => sum + Number(item.totalCost), 0), currency)}</td><td className="px-4 py-3">{staffById.get(intake.createdBy) ?? 'Staff member'}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" />Confirmed</span></td><td className="px-4 py-3"><button onClick={() => setSelected(intake)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`View ${intake.intakeNo}`}><Eye className="h-4 w-4" /></button></td></tr> })}</tbody></table></div>
      {!filtered.length && <p className="px-5 py-10 text-center text-sm text-muted-foreground">No stock intakes match these filters.</p>}
      {filtered.length > pageSize && <div className="flex items-center justify-between border-t px-5 py-3 text-xs text-muted-foreground"><span>Showing {(Math.min(page, pageCount) - 1) * pageSize + 1}–{Math.min(page, pageCount) * pageSize} of {filtered.length}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div>}
    </section>
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset() }}><DialogContent className="max-w-5xl overflow-y-auto sm:max-h-[90vh]"><DialogHeader><DialogTitle>New Stock Intake</DialogTitle><p className="text-sm text-muted-foreground">Add goods that have physically arrived. Stock updates only after confirmation.</p></DialogHeader><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-1 text-xs font-semibold">Location<select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label className="grid gap-1 text-xs font-semibold">Delivery reference <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="DEL-00241" /></label><label className="grid gap-1 text-xs font-semibold">Source <Input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Optional" /></label><label className="grid gap-1 text-xs font-semibold">Reason<select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="new_stock">New stock received</option><option value="opening_stock">Opening stock</option><option value="other">Other</option></select></label></div><div className="rounded-lg border"><div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); scanOrSearch() } }} className="pl-9" placeholder="Scan barcode or search product..." /></div><p className="mt-2 text-xs text-muted-foreground">Scanner ready — scan a product barcode, then press Enter.</p>{productSearch && <div className="mt-2 max-h-44 overflow-auto rounded-md border bg-popover">{matchingProducts.map((product) => <button key={product.id} onClick={() => addProduct(product)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"><span>{product.name}<small className="ml-2 text-muted-foreground">{product.sku ?? product.barcode ?? product.unit}</small></span><span className="text-xs text-primary">Add</span></button>)}</div>}</div>{lineDetails.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-muted/30 uppercase text-muted-foreground"><tr>{['Product','Current stock','Quantity received','Unit','Unit cost','Line value',''].map((label) => <th key={label} className="px-3 py-2.5">{label}</th>)}</tr></thead><tbody className="divide-y">{lineDetails.map((line) => { const balance = balances.filter((item) => item.productId === line.productId && item.branchId === branchId).reduce((sum, item) => sum + Number(item.onHand) - Number(item.reserved) - Number(item.unavailable), 0); return <tr key={line.productId}><td className="px-3 py-3 font-semibold">{line.product.name}<span className="mt-0.5 block font-normal text-muted-foreground">{line.product.sku ?? line.product.unit}</span></td><td className="px-3 py-3 tabular-nums">{formatNumber(balance)}</td><td className="px-3 py-3"><Input type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.productId, { quantity: Math.max(1, Number(event.target.value)) })} className="h-8 w-20" /></td><td className="px-3 py-3"><select value={line.packageId ?? ''} onChange={(event) => updateLine(line.productId, { packageId: event.target.value || undefined })} className="h-8 max-w-36 rounded-md border bg-background px-2"><option value="">{line.product.unit}</option>{(packagesByProduct.get(line.productId) ?? []).map((entry) => <option key={entry.id} value={entry.id}>{entry.name} ({entry.baseUnitQuantity})</option>)}</select></td><td className="px-3 py-3"><Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(event) => updateLine(line.productId, { unitCost: event.target.value })} placeholder={`Current: ${line.product.buyingPrice}`} className="h-8 w-28" /></td><td className="px-3 py-3 font-semibold tabular-nums">{formatCurrency(line.total, currency)}<span className="mt-0.5 block font-normal text-muted-foreground">+{line.baseQuantity} {line.product.unit}</span></td><td className="px-3 py-3"><button onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${line.product.name}`}><Trash2 className="h-4 w-4" /></button></td></tr> })}</tbody></table></div> : <p className="p-6 text-center text-sm text-muted-foreground">Search and add at least one stock item.</p>}</div><label className="grid gap-1 text-xs font-semibold">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="rounded-lg border bg-background p-3 text-sm" placeholder="Optional receiving notes" /></label><div className="flex items-center justify-between border-t pt-4"><p className="text-sm font-semibold">Total intake value <span className="ml-2 tabular-nums">{formatCurrency(totalValue, currency)}</span></p><Button disabled={!branchId || !lines.length || pending} onClick={submit}>{pending ? 'Confirming…' : 'Confirm Stock Intake'}</Button></div></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}><DialogContent>{selected && <><DialogHeader><DialogTitle>Stock Intake {selected.intakeNo}</DialogTitle><p className="text-sm text-muted-foreground">{formatDateTime(new Date(selected.receivedAt))} · {branches.find((branch) => branch.id === selected.branchId)?.name}</p></DialogHeader><div className="space-y-2">{(itemsByIntake.get(selected.id) ?? []).map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><div><p className="font-semibold">{item.productName}</p><p className="text-xs text-muted-foreground">{item.enteredQuantity} {item.enteredUnit} · +{item.baseQuantity} base units</p></div><p className="font-semibold tabular-nums">{formatCurrency(Number(item.totalCost), currency)}</p></div>)}</div>{selected.notes && <p className="rounded-lg bg-muted/40 p-3 text-sm">{selected.notes}</p>}<p className="text-xs text-muted-foreground">Recorded by {staffById.get(selected.createdBy) ?? 'staff member'} · {selected.externalReference ?? 'No external reference'}</p></>}</DialogContent></Dialog>
  </>
}
