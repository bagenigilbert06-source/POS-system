'use client'

import { useState } from 'react'
import { createProduct, updateProduct } from '@/app/actions/products'
import { cn } from '@/lib/utils'
import { Loader2, X } from 'lucide-react'
import type { Product } from '@/lib/db/schema'
import { toast } from 'sonner'

interface ProductFormProps {
  product?: Product
  onClose: () => void
}

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'dozen', 'pack', 'bag', 'bottle', 'tin', 'roll']

export function ProductForm({ product, onClose }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    description: product?.description ?? '',
    buyingPrice: product?.buyingPrice ?? '0',
    sellingPrice: product?.sellingPrice ?? '',
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 5,
    unit: product?.unit ?? 'pcs',
  })

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.sellingPrice) return
    setLoading(true)
    try {
      const data = {
        name: form.name,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        buyingPrice: parseFloat(String(form.buyingPrice)) || 0,
        sellingPrice: parseFloat(String(form.sellingPrice)),
        stock: Number(form.stock),
        minStock: Number(form.minStock),
        unit: form.unit,
      }
      if (product) {
        await updateProduct(product.id, data)
        toast.success('Product updated')
      } else {
        await createProduct(data)
        toast.success('Product created')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = cn(
    'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none',
    'placeholder:text-muted-foreground',
    'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">
            {product ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Product name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Unga Maize Flour 2kg"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputCls}
              />
            </div>

            {/* SKU & Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">SKU</label>
                <input
                  type="text"
                  placeholder="e.g. UMF-2KG"
                  value={form.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Barcode</label>
                <input
                  type="text"
                  placeholder="Scan or enter"
                  value={form.barcode}
                  onChange={(e) => set('barcode', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Buying Price (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.buyingPrice}
                  onChange={(e) => set('buyingPrice', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Selling Price (KES) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={form.sellingPrice}
                  onChange={(e) => set('sellingPrice', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Stock */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Stock Qty</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Min Stock</label>
                <input
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => set('minStock', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Unit</label>
                <select
                  value={form.unit}
                  onChange={(e) => set('unit', e.target.value)}
                  className={inputCls}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                rows={2}
                placeholder="Optional product description"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className={cn(inputCls, 'resize-none')}
              />
            </div>

            {/* Margin */}
            {form.buyingPrice && form.sellingPrice && (
              <div className="rounded-md bg-[hsl(var(--success)/0.08)] border border-[hsl(var(--success)/0.2)] px-3 py-2 text-xs text-[hsl(var(--success))]">
                Margin: KES {(parseFloat(String(form.sellingPrice)) - parseFloat(String(form.buyingPrice))).toFixed(2)}{' '}
                ({parseFloat(String(form.buyingPrice)) > 0
                  ? (((parseFloat(String(form.sellingPrice)) - parseFloat(String(form.buyingPrice))) / parseFloat(String(form.buyingPrice))) * 100).toFixed(1)
                  : 0}%)
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                'hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
