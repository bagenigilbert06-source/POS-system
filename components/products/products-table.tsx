'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { archiveProduct } from '@/app/actions/products'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Archive, Pencil, Plus, Search, Package, AlertTriangle } from 'lucide-react'
import { ProductForm } from './product-form'
import type { Product } from '@/lib/db/schema'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface ProductsTableProps {
  initialProducts: Product[]
}

export function ProductsTable({ initialProducts }: ProductsTableProps) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | undefined>()
  const [archiving, setArchiving] = useState<string | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null)
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'active' | 'archived'>('all')

  useEffect(() => setProducts(initialProducts), [initialProducts])

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? '').toLowerCase().includes(search.toLowerCase())

    if (filter === 'low-stock') return matchSearch && p.isActive && p.stock <= p.minStock
    if (filter === 'active') return matchSearch && p.isActive
    if (filter === 'archived') return matchSearch && !p.isActive
    return matchSearch
  })

  const handleArchive = async () => {
    if (!archiveTarget) return
    setArchiving(archiveTarget.id)
    try {
      await archiveProduct(archiveTarget.id)
      setProducts((prev) => prev.map((item) => item.id === archiveTarget.id ? { ...item, isActive: false } : item))
      toast.success('Product archived')
    } catch {
      toast.error('Failed to archive product')
    } finally {
      setArchiving(null)
      setArchiveTarget(null)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditProduct(undefined)
    router.refresh()
  }

  const stockStatus = (p: Product) => {
    if (p.stock === 0) return 'out'
    if (p.stock <= p.minStock) return 'low'
    return 'ok'
  }

  const stockBadge = {
    ok: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
    low: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
    out: 'bg-destructive/10 text-destructive',
  }

  const filterTabs = [
    { key: 'all', label: 'All Products' },
    { key: 'low-stock', label: 'Low Stock' },
    { key: 'active', label: 'Active' },
    { key: 'archived', label: 'Archived' },
  ] as const

  return (
    <>
      {(showForm || editProduct) && (
        <ProductForm
          product={editProduct}
          onClose={handleFormClose}
        />
      )}
      <AlertDialog open={Boolean(archiveTarget)} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Archive this product?</AlertDialogTitle><AlertDialogDescription>{archiveTarget?.name} will no longer appear in active product and POS lists. Existing sales records remain unchanged.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Keep product</AlertDialogCancel><AlertDialogAction onClick={handleArchive} className="bg-primary text-primary-foreground hover:bg-primary/90">Archive product</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
          <button
            onClick={() => { setEditProduct(undefined); setShowForm(true) }}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border bg-muted p-1 sm:w-fit">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? 'Try a different search term.' : 'Add your first product to get started.'}
              </p>
            </div>
          ) : (
            <>
            <div className="grid gap-3 p-3 md:hidden">
              {filtered.map((p) => {
                const status = stockStatus(p)
                return <article key={p.id} className="rounded-xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.sku ? `SKU ${p.sku}` : 'No SKU'} · {p.isActive ? 'Active' : 'Archived'}</p></div><button onClick={() => { setEditProduct(p); setShowForm(true) }} className="app-icon-button" aria-label={`Edit ${p.name}`}><Pencil className="h-4 w-4" /></button></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Selling price</dt><dd className="mt-1 font-bold tabular-nums">{formatCurrency(p.sellingPrice)}</dd></div><div><dt className="text-xs text-muted-foreground">Stock</dt><dd className="mt-1"><span className={cn('rounded-full px-2 py-1 text-xs font-semibold', stockBadge[status])}>{p.stock} {p.unit}</span></dd></div></dl>{p.isActive && <button onClick={() => setArchiveTarget(p)} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground"><Archive className="h-4 w-4" />Archive</button>}</article>
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Buying</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Selling</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Margin</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Stock</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Unit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const buying = parseFloat(p.buyingPrice)
                    const selling = parseFloat(p.sellingPrice)
                    const margin = selling - buying
                    const marginPct = buying > 0 ? (margin / buying) * 100 : 0
                    const status = stockStatus(p)

                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#fff3be] text-[#050a1f]">
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[200px]">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.sku ? `SKU: ${p.sku}` : 'No SKU'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(buying)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatCurrency(selling)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={cn('text-xs', margin >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive')}>
                            {margin >= 0 ? '+' : ''}{formatCurrency(margin)}
                            <br />
                            <span className="text-[10px]">({marginPct.toFixed(0)}%)</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {status !== 'ok' && <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />}
                            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', stockBadge[status])}>
                              {p.stock} {p.unit}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {p.unit}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditProduct(p); setShowForm(true) }}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                              aria-label="Edit product"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {p.isActive && <button onClick={() => setArchiveTarget(p)} disabled={archiving === p.id} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40" aria-label={`Archive ${p.name}`}><Archive className="h-3.5 w-3.5" /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div></>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {products.length} products
        </p>
      </div>
    </>
  )
}
