'use client'

import { useState } from 'react'
import { createProduct, updateProduct } from '@/app/actions/products'
import { cn } from '@/lib/utils'
import { Barcode, Boxes, Check, CircleDollarSign, Loader2, Package2, Tag, X } from 'lucide-react'
import type { Product } from '@/lib/db/schema'
import { toast } from 'sonner'

interface ProductFormProps {
  product?: Product
  categories: Array<{ id: string; name: string }>
  onClose: () => void
}

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'dozen', 'pack', 'bag', 'bottle', 'tin', 'roll']

export function ProductForm({ product, categories, onClose }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; sellingPrice?: string }>({})
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? '',
    buyingPrice: product?.buyingPrice ?? '0',
    sellingPrice: product?.sellingPrice ?? '',
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 5,
    unit: product?.unit ?? 'pcs',
  })

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = {
      name: form.name.trim() ? undefined : 'Enter a product name.',
      sellingPrice: Number(form.sellingPrice) >= 0 && form.sellingPrice !== '' ? undefined : 'Enter a selling price.',
    }
    if (nextErrors.name || nextErrors.sellingPrice) {
      setErrors(nextErrors)
      return
    }
    setLoading(true)
    try {
      const data = {
        name: form.name.trim(),
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
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

  const buying = Number(form.buyingPrice) || 0
  const selling = Number(form.sellingPrice) || 0
  const margin = selling - buying
  const marginPercent = buying > 0 ? (margin / buying) * 100 : 0

  const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="mb-1.5 block text-sm font-medium text-foreground">
      {children}{required && <span className="ml-1 text-destructive">*</span>}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 sm:p-6">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <div className="flex items-start justify-between border-b px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{product ? 'Edit product' : 'New product'}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Set up the product, price and stock levels for your catalogue.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close product form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
            <section>
              <div className="mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Product details</h3></div>
              <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
                <div>
                  <FieldLabel required>Product name</FieldLabel>
              <input
                type="text"
                    placeholder="e.g. Johnnie Walker Black Label 750ml"
                value={form.name}
                    onChange={(e) => { set('name', e.target.value); setErrors((current) => ({ ...current, name: undefined })) }}
                    className={cn(inputCls, errors.name && 'border-destructive focus:border-destructive focus:ring-destructive/20')}
              />
                  {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                    <FieldLabel>SKU</FieldLabel>
                <input
                  type="text"
                      placeholder="e.g. JWB-750"
                  value={form.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                    <FieldLabel>Barcode</FieldLabel>
                <input
                  type="text"
                  placeholder="Scan or enter"
                  value={form.barcode}
                  onChange={(e) => set('barcode', e.target.value)}
                  className={inputCls}
                />
              </div>
                  <div>
                    <FieldLabel>Category</FieldLabel>
                    <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={inputCls}>
                      <option value="">Uncategorised</option>
                      {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <FieldLabel>Description</FieldLabel>
                  <textarea rows={2} placeholder="Optional product description" value={form.description} onChange={(e) => set('description', e.target.value)} className={cn(inputCls, 'resize-y')} />
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Pricing</h3></div>
              <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
              <div>
                    <FieldLabel>Buying price <span className="font-normal text-muted-foreground">(KES)</span></FieldLabel>
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
                    <FieldLabel required>Selling price <span className="font-normal text-muted-foreground">(KES)</span></FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.sellingPrice}
                      onChange={(e) => { set('sellingPrice', e.target.value); setErrors((current) => ({ ...current, sellingPrice: undefined })) }}
                      className={cn(inputCls, errors.sellingPrice && 'border-destructive focus:border-destructive focus:ring-destructive/20')}
                />
                    {errors.sellingPrice && <p className="mt-1.5 text-xs text-destructive">{errors.sellingPrice}</p>}
                  </div>
                </div>
                <div className={cn('mt-4 flex items-center justify-between rounded-md border px-3 py-2.5 text-sm', margin >= 0 ? 'border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.06)]' : 'border-destructive/25 bg-destructive/5')}>
                  <span className="text-muted-foreground">Expected gross margin</span>
                  <span className={cn('font-semibold tabular-nums', margin >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive')}>KES {margin.toFixed(2)} {buying > 0 && `(${marginPercent.toFixed(1)}%)`}</span>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Inventory</h3></div>
              <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
                <p className="mb-4 text-xs text-muted-foreground">Set the opening quantity and the level at which this product should be flagged for reorder.</p>
                <div className="grid gap-4 sm:grid-cols-3">
              <div>
                    <FieldLabel>Opening stock</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                    <FieldLabel>Reorder level</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => set('minStock', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                    <FieldLabel>Unit of measure</FieldLabel>
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
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-4 sm:px-6">
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" />Changes are saved to your workspace.</p>
            <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
                className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                  'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60'
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {product ? 'Save changes' : 'Create product'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
