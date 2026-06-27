'use client'

import { useState } from 'react'
import { deleteProduct } from '@/app/actions/products'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Pencil, Trash2, Plus, Search, Package, AlertTriangle } from 'lucide-react'
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
    // Reload via router refresh is handled by revalidatePath in action
    window.location.reload()
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
  ] as const

  return (
    <>
      {(showForm || editProduct) && (
        <ProductForm
          product={editProduct}
          onClose={handleFormClose}
        />
      )}

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
        <div className="flex gap-1 rounded-lg border bg-muted p-1 w-fit">
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
            <div className="overflow-x-auto">
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
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting === p.id}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
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
        </div>

        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {products.length} products
        </p>
      </div>
    </>
  )
}
