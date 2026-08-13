'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowDown, ArrowUp, Check, ClipboardCheck, Download, History, PackageCheck, Pencil, Search, Settings2, ShoppingCart, SlidersHorizontal, X } from 'lucide-react'
import { toast } from 'sonner'
import { approveStockAdjustment, createStockAdjustment, rejectStockAdjustment, updateReorderLevel } from '@/app/actions/stock-adjustments'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Product, StockAdjustment, StockAdjustmentItem, StockMovement } from '@/lib/db/schema'
import { estimatedStockCoverDays, inventoryStatus, recommendedOrderQuantity, type InventoryStatus } from '@/lib/inventory/rules'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDateTime } from '@/lib/utils'

type Tab = 'stock' | 'replenishment' | 'counts' | 'movements'
type InventoryProduct = Product & { unitsSoldMonth: number }

interface InventoryManagerProps {
  products: InventoryProduct[]
  movements: StockMovement[]
  adjustments: StockAdjustment[]
  adjustmentItems: StockAdjustmentItem[]
  currency: string
  canAdjust: boolean
  canPurchase: boolean
}

export function InventoryManager({ products, movements, adjustments, adjustmentItems, currency, canAdjust, canPurchase }: InventoryManagerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>('stock')
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | InventoryStatus>('all')
  const [movementFilter, setMovementFilter] = useState('all')
  const [countProduct, setCountProduct] = useState<InventoryProduct | null>(null)
  const [reorderProduct, setReorderProduct] = useState<InventoryProduct | null>(null)

  const statusOf = (item: InventoryProduct): InventoryStatus => inventoryStatus(item.stock, item.minStock)
  const normalizedSearch = search.trim().toLowerCase()
  const visibleProducts = useMemo(() => products.filter((item) => {
    const matchesSearch = !normalizedSearch || [item.name, item.sku, item.barcode, item.brand].some((value) => value?.toLowerCase().includes(normalizedSearch))
    return matchesSearch && (stockFilter === 'all' || statusOf(item) === stockFilter)
  }).sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name)), [products, normalizedSearch, stockFilter])
  const replenishment = products.filter((item) => item.stock <= item.minStock).sort((a, b) => (a.stock - a.minStock) - (b.stock - b.minStock))
  const movementTypes = [...new Set(movements.map((item) => item.type))].sort()
  const visibleMovements = movements.filter((item) => {
    const matchesSearch = !normalizedSearch || [item.productName, item.reason, item.referenceType].some((value) => value?.toLowerCase().includes(normalizedSearch))
    return matchesSearch && (movementFilter === 'all' || item.type === movementFilter)
  })
  const itemsByAdjustment = new Map<string, StockAdjustmentItem[]>()
  adjustmentItems.forEach((item) => itemsByAdjustment.set(item.adjustmentId, [...(itemsByAdjustment.get(item.adjustmentId) ?? []), item]))

  const run = (action: () => Promise<unknown>, success: string, after?: () => void) => startTransition(async () => {
    try {
      await action()
      toast.success(success)
      after?.()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Inventory action failed')
    }
  })

  const exportStock = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const rows = [['Product', 'SKU', 'Barcode', 'On hand', 'Unit', 'Reorder level', 'Units sold this month', 'Estimated cover days', 'Status', 'Unit cost', 'Stock value'], ...visibleProducts.map((item) => [item.name, item.sku ?? '', item.barcode ?? '', item.stock, item.unit, item.minStock, item.unitsSoldMonth, estimatedStockCoverDays(item.stock, item.unitsSoldMonth)?.toFixed(1) ?? '', statusOf(item), item.buyingPrice, Number(item.buyingPrice) * item.stock])]
    const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const tabs: { id: Tab; label: string; count?: number; icon: React.ElementType }[] = [
    { id: 'stock', label: 'Stock on hand', count: products.length, icon: PackageCheck },
    { id: 'replenishment', label: 'Replenishment', count: replenishment.length, icon: ShoppingCart },
    { id: 'counts', label: 'Counts & adjustments', count: adjustments.filter((item) => item.status === 'pending').length, icon: ClipboardCheck },
    { id: 'movements', label: 'Movement ledger', count: movements.length, icon: History },
  ]

  return <>
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex gap-1 overflow-x-auto border-b bg-muted/20 p-2">
        {tabs.map(({ id, label, count, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={cn('inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors', tab === id ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground')}><Icon className="h-4 w-4" />{label}{typeof count === 'number' && <span className={cn('rounded-full px-1.5 py-0.5 text-[0.65rem]', tab === id ? 'bg-[#fff3bd] text-[#765800] dark:bg-[rgba(255,214,10,.12)] dark:text-[#ffd60a]' : 'bg-muted text-muted-foreground')}>{count}</span>}</button>)}
      </div>

      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === 'movements' ? 'Search product, reason or reference…' : 'Search product, SKU or barcode…'} className="h-10 pl-9" /></div>
        <div className="flex flex-wrap items-center gap-2">
          {tab === 'stock' && <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as typeof stockFilter)}><SelectTrigger className="h-10 w-[150px]"><SlidersHorizontal className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All stock</SelectItem><SelectItem value="healthy">Healthy</SelectItem><SelectItem value="low">Low stock</SelectItem><SelectItem value="out">Out of stock</SelectItem></SelectContent></Select>}
          {tab === 'movements' && <Select value={movementFilter} onValueChange={setMovementFilter}><SelectTrigger className="h-10 w-[180px]"><Settings2 className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All movement types</SelectItem>{movementTypes.map((type) => <SelectItem key={type} value={type} className="capitalize">{type.replaceAll('_', ' ')}</SelectItem>)}</SelectContent></Select>}
          <Button type="button" variant="outline" onClick={exportStock} className="h-10 gap-2"><Download className="h-4 w-4" />Export CSV</Button>
          {canAdjust && tab !== 'movements' && <Button type="button" onClick={() => setCountProduct(products[0] ?? null)} disabled={!products.length} className="h-10 gap-2"><ClipboardCheck className="h-4 w-4" />Count stock</Button>}
        </div>
      </div>

      {tab === 'stock' && <StockTable products={visibleProducts} currency={currency} statusOf={statusOf} canAdjust={canAdjust} onCount={setCountProduct} onReorder={setReorderProduct} />}
      {tab === 'replenishment' && <Replenishment products={replenishment} currency={currency} canPurchase={canPurchase} canAdjust={canAdjust} onReorder={setReorderProduct} />}
      {tab === 'counts' && <AdjustmentHistory adjustments={adjustments} itemsByAdjustment={itemsByAdjustment} pending={pending} canAdjust={canAdjust} run={run} />}
      {tab === 'movements' && <MovementLedger movements={visibleMovements} />}
    </section>

    <Dialog open={Boolean(countProduct)} onOpenChange={(open) => !open && setCountProduct(null)}>
      <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Record a physical stock count</DialogTitle><DialogDescription>Enter what was physically counted. The variance remains pending until reviewed and approved.</DialogDescription></DialogHeader>
        {countProduct && <form action={(form) => run(() => createStockAdjustment({ type: String(form.get('type')) as 'stocktake' | 'loss' | 'damage' | 'correction', items: [{ productId: String(form.get('productId')), quantityAfter: Number(form.get('quantityAfter')) }], notes: String(form.get('notes')) }), 'Stock count submitted for approval', () => setCountProduct(null))} className="space-y-4 pt-2">
          <div className="space-y-2"><Label>Product</Label><Select name="productId" value={countProduct.id} onValueChange={(id) => setCountProduct(products.find((item) => item.id === id) ?? countProduct)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{products.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.stock} {item.unit}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">System quantity: <strong className="text-foreground">{countProduct.stock} {countProduct.unit}</strong></p></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="counted-quantity">Physical quantity</Label><Input key={countProduct.id} id="counted-quantity" name="quantityAfter" type="number" min="0" max="10000000" defaultValue={countProduct.stock} required /></div><div className="space-y-2"><Label>Count reason</Label><Select name="type" defaultValue="stocktake" required><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="stocktake">Cycle count</SelectItem><SelectItem value="correction">Correction</SelectItem><SelectItem value="damage">Damage</SelectItem><SelectItem value="loss">Loss</SelectItem></SelectContent></Select></div></div>
          <div className="space-y-2"><Label htmlFor="count-notes">Count notes</Label><Input id="count-notes" name="notes" minLength={3} maxLength={500} required placeholder="Where, why, or who performed this count" /></div>
          <Button disabled={pending} className="w-full">{pending ? 'Submitting…' : 'Submit count for approval'}</Button>
        </form>}
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(reorderProduct)} onOpenChange={(open) => !open && setReorderProduct(null)}>
      <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Update reorder level</DialogTitle><DialogDescription>Pesaby flags this item when on-hand stock reaches this quantity.</DialogDescription></DialogHeader>
        {reorderProduct && <form action={(form) => run(() => updateReorderLevel({ productId: reorderProduct.id, minStock: Number(form.get('minStock')) }), 'Reorder level updated', () => setReorderProduct(null))} className="space-y-4 pt-2"><div className="rounded-lg border bg-muted/20 px-4 py-3"><p className="font-semibold">{reorderProduct.name}</p><p className="mt-1 text-xs text-muted-foreground">Currently {reorderProduct.stock} {reorderProduct.unit} on hand</p></div><div className="space-y-2"><Label htmlFor="reorder-level">Low-stock alert level</Label><Input id="reorder-level" name="minStock" type="number" min="0" max="10000000" defaultValue={reorderProduct.minStock} required /></div><Button disabled={pending} className="w-full">{pending ? 'Saving…' : 'Save reorder level'}</Button></form>}
      </DialogContent>
    </Dialog>
  </>
}

function StockTable({ products, currency, statusOf, canAdjust, onCount, onReorder }: { products: InventoryProduct[]; currency: string; statusOf: (item: InventoryProduct) => InventoryStatus; canAdjust: boolean; onCount: (item: InventoryProduct) => void; onReorder: (item: InventoryProduct) => void }) {
  if (!products.length) return <Empty title="No matching inventory" detail="Try changing the search or stock status filter." />
  return <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-sm"><thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Product</th><th className="px-4 py-3 text-right font-semibold">On hand</th><th className="px-4 py-3 text-right font-semibold">Reorder at</th><th className="px-4 py-3 text-right font-semibold">30-day demand</th><th className="px-4 py-3 text-right font-semibold">Stock cover</th><th className="px-4 py-3 text-right font-semibold">Unit cost</th><th className="px-4 py-3 text-right font-semibold">Stock value</th><th className="px-4 py-3 text-center font-semibold">Status</th>{canAdjust && <th className="px-5 py-3 text-right font-semibold">Actions</th>}</tr></thead><tbody className="divide-y">{products.map((item) => { const status = statusOf(item); const cover = estimatedStockCoverDays(item.stock, item.unitsSoldMonth); return <tr key={item.id} className="hover:bg-muted/20"><td className="px-5 py-3.5"><p className="font-semibold">{item.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.sku || 'No SKU'}{item.barcode ? ` · ${item.barcode}` : ''}</p></td><td className="px-4 py-3.5 text-right font-bold tabular-nums">{item.stock} <span className="font-normal text-muted-foreground">{item.unit}</span></td><td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{item.minStock}</td><td className="px-4 py-3.5 text-right tabular-nums">{item.unitsSoldMonth}</td><td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{cover === null ? 'No recent sales' : `${Math.round(cover)} days`}</td><td className="px-4 py-3.5 text-right tabular-nums">{formatCurrency(Number(item.buyingPrice), currency)}</td><td className="px-4 py-3.5 text-right font-semibold tabular-nums">{formatCurrency(Number(item.buyingPrice) * item.stock, currency)}</td><td className="px-4 py-3.5 text-center"><StockBadge status={status} /></td>{canAdjust && <td className="px-5 py-3.5"><div className="flex justify-end gap-1"><button type="button" onClick={() => onCount(item)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Count ${item.name}`} title="Record physical count"><ClipboardCheck className="h-4 w-4" /></button><button type="button" onClick={() => onReorder(item)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Edit reorder level for ${item.name}`} title="Edit reorder level"><Pencil className="h-4 w-4" /></button></div></td>}</tr>})}</tbody></table></div>
}

function Replenishment({ products, currency, canPurchase, canAdjust, onReorder }: { products: InventoryProduct[]; currency: string; canPurchase: boolean; canAdjust: boolean; onReorder: (item: InventoryProduct) => void }) {
  if (!products.length) return <Empty title="Stock levels are healthy" detail="Nothing is currently at or below its reorder level." positive />
  return <div><div className="border-b bg-amber-50/60 px-5 py-4 text-sm dark:bg-amber-950/10"><p className="font-semibold text-amber-900 dark:text-amber-200">Suggested quantities use both the safety level and recent 30-day demand.</p><p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/70">Review supplier pack sizes and expected demand before ordering.</p></div><div className="divide-y">{products.map((item) => { const suggested = recommendedOrderQuantity(item.stock, item.minStock, item.unitsSoldMonth); return <article key={item.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center"><span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', item.stock <= 0 ? 'bg-red-500' : 'bg-amber-500')} /><div className="min-w-0 flex-1"><p className="font-semibold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.stock} {item.unit} on hand · alert at {item.minStock} · {item.unitsSoldMonth} sold this month · {formatCurrency(Number(item.buyingPrice) * suggested, currency)} estimated cost</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="text-xs text-muted-foreground">Suggested order</p><p className="font-bold tabular-nums">{suggested} {item.unit}</p></div>{canAdjust && <Button variant="outline" size="sm" onClick={() => onReorder(item)}>Edit level</Button>}{canPurchase && <Button asChild size="sm"><Link href={`/dashboard/purchases?productId=${item.id}`}>Receive stock</Link></Button>}</div></article>})}</div></div>
}

function AdjustmentHistory({ adjustments, itemsByAdjustment, pending, canAdjust, run }: { adjustments: StockAdjustment[]; itemsByAdjustment: Map<string, StockAdjustmentItem[]>; pending: boolean; canAdjust: boolean; run: (action: () => Promise<unknown>, success: string, after?: () => void) => void }) {
  if (!adjustments.length) return <Empty title="No stock counts yet" detail="Use Count stock to record the first physical count and variance." />
  return <div className="divide-y">{adjustments.map((adjustment) => { const items = itemsByAdjustment.get(adjustment.id) ?? []; const variance = items.reduce((sum, item) => sum + item.variance, 0); return <article key={adjustment.id} className="px-5 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{adjustment.adjustmentNo}</p><span className="rounded-full bg-muted px-2 py-0.5 text-[0.68rem] font-semibold capitalize">{adjustment.type}</span><span className={cn('rounded-full px-2 py-0.5 text-[0.68rem] font-bold capitalize', adjustment.status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : adjustment.status === 'rejected' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300')}>{adjustment.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(adjustment.createdAt)} · {adjustment.notes || 'No notes'}</p><div className="mt-2 flex flex-wrap gap-2">{items.map((item) => <span key={item.id} className="rounded-md border bg-muted/20 px-2 py-1 text-xs">{item.productName}: {item.quantityBefore} → {item.quantityAfter} <strong className={item.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}>({item.variance >= 0 ? '+' : ''}{item.variance})</strong></span>)}</div></div><div className="flex shrink-0 items-center gap-2"><span className={cn('mr-2 text-sm font-bold tabular-nums', variance >= 0 ? 'text-emerald-600' : 'text-red-600')}>{variance >= 0 ? '+' : ''}{variance} net</span>{canAdjust && adjustment.status === 'pending' && <><Button size="sm" disabled={pending} onClick={() => run(() => approveStockAdjustment(adjustment.id), 'Stock count approved')} className="gap-1.5"><Check className="h-3.5 w-3.5" />Approve</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => { const reason = window.prompt('Why are you rejecting this stock count?'); if (reason) run(() => rejectStockAdjustment(adjustment.id, reason), 'Stock count rejected') }} className="gap-1.5"><X className="h-3.5 w-3.5" />Reject</Button></>}</div></div></article>})}</div>
}

function MovementLedger({ movements }: { movements: StockMovement[] }) {
  if (!movements.length) return <Empty title="No matching stock movements" detail="Sales, receipts, returns, losses and approved counts appear here." />
  return <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b bg-muted/20 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Movement</th><th className="px-4 py-3 text-right font-semibold">Change</th><th className="px-4 py-3 text-right font-semibold">Balance</th><th className="px-5 py-3 font-semibold">Reason / reference</th></tr></thead><tbody className="divide-y">{movements.map((item) => <tr key={item.id} className="hover:bg-muted/20"><td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</td><td className="px-4 py-3 font-semibold">{item.productName}</td><td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold capitalize">{item.type.replaceAll('_', ' ')}</span></td><td className={cn('px-4 py-3 text-right font-bold tabular-nums', item.quantity >= 0 ? 'text-emerald-600' : 'text-red-600')}>{item.quantity >= 0 ? <ArrowUp className="mr-1 inline h-3.5 w-3.5" /> : <ArrowDown className="mr-1 inline h-3.5 w-3.5" />}{item.quantity > 0 ? '+' : ''}{item.quantity}</td><td className="px-4 py-3 text-right tabular-nums">{item.stockBefore} → <strong>{item.stockAfter}</strong></td><td className="max-w-xs truncate px-5 py-3 text-xs text-muted-foreground">{item.reason || item.referenceType || 'No reference'}</td></tr>)}</tbody></table></div>
}

function StockBadge({ status }: { status: InventoryStatus }) {
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', status === 'healthy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : status === 'low' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300')}>{status === 'healthy' ? 'In stock' : status === 'low' ? 'Low stock' : 'Out of stock'}</span>
}

function Empty({ title, detail, positive = false }: { title: string; detail: string; positive?: boolean }) {
  const Icon = positive ? Check : AlertTriangle
  return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><span className={cn('flex h-12 w-12 items-center justify-center rounded-xl', positive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-muted text-muted-foreground')}><Icon className="h-6 w-6" /></span><p className="mt-3 font-semibold">{title}</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p></div>
}
