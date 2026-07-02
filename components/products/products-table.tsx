'use client'

import { useState } from 'react'
import { deleteProduct } from '@/app/actions/products'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, Plus, Search, Package, AlertTriangle, Tag, BarChart3 } from 'lucide-react'
import { ProductForm } from './product-form'
import type { Product } from '@/lib/db/schema'
import { toast } from 'sonner'

interface ProductsTableProps {
  initialProducts: Product[]
}

export function ProductsTable({ initialProducts }: ProductsTableProps) {
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | undefined>()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'active'>('all')

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? '').toLowerCase().includes(search.toLowerCase())

    if (filter === 'low-stock') return matchSearch && p.stock <= p.minStock
    if (filter === 'active') return matchSearch && p.isActive
    return matchSearch
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
      toast.success('Product deleted')
    } catch {
      toast.error('Failed to delete product')
    } finally {
      setDeleting(null)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditProduct(undefined)
    window.location.reload()
  }

  const stockStatus = (p: Product) => {
    if (p.stock === 0) return 'out'
    if (p.stock <= p.minStock) return 'low'
    return 'ok'
  }

  const stockBadge = {
    ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    low: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    out: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  }

  const filterTabs = [
    { key: 'all', label: 'All Products' },
    { key: 'low-stock', label: 'Low Stock' },
    { key: 'active', label: 'Active' },
  ] as const

  const totalValue = products.reduce((sum, p) => sum + parseFloat(p.sellingPrice) * p.stock, 0)
  const lowStockCount = products.filter((p) => p.stock <= p.minStock && p.stock > 0).length
  const outOfStockCount = products.filter((p) => p.stock === 0).length

  return (
    <>
      {(showForm || editProduct) && (
        <ProductForm product={editProduct} onClose={handleFormClose} />
      )}

      <div className="space-y-4">
        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Total Products</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{products.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Inventory Value</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{formatCurrency(totalValue)}</p>
          </div>
          <div className="rounded-xl border border-[#d1fae5] bg-[#f0fdf4] p-4 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30">
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Low Stock</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-300">{lowStockCount}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm dark:border-red-900 dark:bg-red-950/20">
            <p className="text-xs font-medium text-red-600 dark:text-red-400">Out of Stock</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-red-700 dark:text-red-300">{outOfStockCount}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products, SKU, barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#1a5c38] focus:ring-2 focus:ring-[#1a5c38]/15 transition-colors"
            />
          </div>
          <button
            onClick={() => { setEditProduct(undefined); setShowForm(true) }}
            className="flex items-center gap-2 rounded-lg bg-[#1a5c38] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#154d30] transition-colors flex-shrink-0 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1 w-fit">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === tab.key
                  ? 'bg-[#1a5c38] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table card */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Table header bar */}
          <div className="flex items-center justify-between border-b border-border bg-[#1a5c38] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-white/80" />
              <span className="text-sm font-semibold text-white">Product Catalog</span>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
              {filtered.length} items
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Package className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">No products found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search ? 'Try a different search term.' : 'Add your first product to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buying</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selling</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Margin</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stock</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => {
                    const buying = parseFloat(p.buyingPrice)
                    const selling = parseFloat(p.sellingPrice)
                    const margin = selling - buying
                    const marginPct = buying > 0 ? (margin / buying) * 100 : 0
                    const status = stockStatus(p)

                    return (
                      <tr key={p.id} className="group hover:bg-[#1a5c38]/5 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#e6f4ed] text-[#1a5c38] dark:bg-[#1a5c38]/20 dark:text-emerald-400">
                              <Tag className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[200px]">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {p.sku ? `SKU: ${p.sku}` : 'No SKU'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(buying)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                          {formatCurrency(selling)}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          <div className="inline-flex flex-col items-end">
                            <span className={cn('text-sm font-medium', margin >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600')}>
                              {margin >= 0 ? '+' : ''}{formatCurrency(margin)}
                            </span>
                            <span className={cn('text-[10px]', margin >= 0 ? 'text-emerald-600/70 dark:text-emerald-500' : 'text-red-500/70')}>
                              {marginPct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {status !== 'ok' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', stockBadge[status])}>
                              {p.stock}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center text-xs font-medium text-muted-foreground">
                          {p.unit}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditProduct(p); setShowForm(true) }}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#e6f4ed] hover:text-[#1a5c38] transition-colors"
                              aria-label="Edit product"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting === p.id}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                              aria-label="Delete product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Showing {filtered.length} of {products.length} products
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Inventory value: <span className="font-semibold text-foreground">{formatCurrency(totalValue)}</span></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
