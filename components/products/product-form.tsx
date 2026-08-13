'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createProduct, findProductByBarcode, updateProduct } from '@/app/actions/products'
import { createCategory } from '@/app/actions/categories'
import { cn, formatCurrency, normalizeBarcode } from '@/lib/utils'
import { Barcode, Boxes, Check, CircleDollarSign, ImageIcon, Loader2, Package2, Smartphone, Tag, Upload, X } from 'lucide-react'
import type { Product } from '@/lib/db/schema'
import { toast } from 'sonner'
import { WirelessScannerPairing } from '@/components/barcode/wireless-scanner-pairing'

interface ProductFormProps {
  product?: Product
  categories: Array<{ id: string; name: string; parentCategoryId?: string | null; isActive?: boolean }>
  onClose?: () => void
  initialCategoryId?: string
  initialBarcode?: string
}

const SELLING_UNITS = ['bottle', 'can', 'carton', 'crate', 'pack', 'keg', 'piece', 'other']
const VOLUME_UNITS = ['ml', 'litre']

export function ProductForm({ product, categories, onClose, initialCategoryId, initialBarcode }: ProductFormProps) {
  const router = useRouter()
  const closeEditor = () => {
    if (onClose) onClose()
    else router.push('/dashboard/products')
  }
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<{ name?: string; categoryId?: string; sellingPrice?: string; buyingPrice?: string; stock?: string; barcode?: string }>({})
  const [barcodeMatch, setBarcodeMatch] = useState<{ id: string; name: string } | null>(null)
  const [showPhoneScanner, setShowPhoneScanner] = useState(false)
  const [availableCategories, setAvailableCategories] = useState(categories)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', parentCategoryId: '', description: '' })
  const [creatingCategory, setCreatingCategory] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const barcodeCheckRef = useRef(0)
  const [form, setForm] = useState({
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? normalizeBarcode(initialBarcode ?? ''),
    description: product?.description ?? '',
    imageUrl: product?.imageUrl ?? '',
    categoryId: product?.categoryId ?? initialCategoryId ?? '',
    buyingPrice: product?.buyingPrice ?? '0',
    sellingPrice: product?.sellingPrice ?? '',
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 5,
    unit: product?.unit ?? 'bottle',
    volume: product?.volume ?? '',
    volumeUnit: product?.volumeUnit ?? 'ml',
    abv: product?.abv ?? '',
    countryOfOrigin: product?.countryOfOrigin ?? '',
    unitsPerPack: product?.unitsPerPack ?? '',
    preferredSupplierId: product?.preferredSupplierId ?? '',
  })

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }))
  const categoryLabel = (item: { id: string; name: string; parentCategoryId?: string | null }) => {
    const parent = availableCategories.find((candidate) => candidate.id === item.parentCategoryId)
    return parent ? `${parent.name} / ${item.name}` : item.name
  }
  const selectableCategories = availableCategories.filter((item) => item.isActive !== false || item.id === product?.categoryId)

  const addCategory = async () => {
    if (!newCategory.name.trim()) return
    setCreatingCategory(true)
    try {
      const created = await createCategory({ name: newCategory.name, parentCategoryId: newCategory.parentCategoryId || null, description: newCategory.description || undefined })
      set('categoryId', created.id)
      setAvailableCategories((current) => [...current, { id: created.id, name: newCategory.name.trim(), parentCategoryId: newCategory.parentCategoryId || null, isActive: true }].sort((left, right) => left.name.localeCompare(right.name)))
      setNewCategory({ name: '', parentCategoryId: '', description: '' })
      setCategoryDialogOpen(false)
      toast.success('Category created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleImageSelection = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Choose an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image is too large. Choose an image smaller than 5 MB.')
    setUploadingImage(true)
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not optimize image')), 'image/webp', 0.84))
      const body = new FormData(); body.append('file', new File([blob], 'product.webp', { type: 'image/webp' }))
      const response = await fetch('/api/products/images', { method: 'POST', body })
      const responseText = await response.text()
      let result: { url?: string; error?: string } = {}
      try { result = responseText ? JSON.parse(responseText) : {} } catch { /* A proxy/server error can return HTML or an empty body. */ }
      if (!response.ok) throw new Error(result.error || `Image upload failed (${response.status}). Try again.`)
      if (!result.url) throw new Error('Image upload did not return a file URL. Try again.')
      set('imageUrl', result.url); toast.success('Image uploaded successfully.')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Image upload failed. Try again.') }
    finally { setUploadingImage(false) }
  }

  const steps = ['Product', 'Identification', 'Pricing', 'Stock', 'Review']
  const continueStep = () => {
    if (step === 1 && (!form.name.trim() || (!product && !form.categoryId))) {
      setErrors((current) => ({ ...current, name: form.name.trim() ? undefined : 'Enter a product name.', categoryId: !product && !form.categoryId ? 'Choose a category.' : undefined }))
      return
    }
    if (step === 3 && (!form.buyingPrice || !form.sellingPrice)) return
    setStep((current) => Math.min(5, current + 1))
  }

  const checkBarcode = async (value: string) => {
    const requestId = ++barcodeCheckRef.current
    const normalized = normalizeBarcode(value)
    set('barcode', normalized)
    setBarcodeMatch(null)
    setErrors((current) => ({ ...current, barcode: undefined }))
    if (normalized) {
      const match = await findProductByBarcode(normalized, product?.id)
      if (requestId !== barcodeCheckRef.current) return
      if (match) { setBarcodeMatch(match); setErrors((current) => ({ ...current, barcode: `This barcode already belongs to ${match.name}.` })) }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = {
      name: form.name.trim() ? undefined : 'Enter a product name.',
      categoryId: !product && !form.categoryId ? 'Choose a category.' : undefined,
      buyingPrice: Number(form.buyingPrice) >= 0 && form.buyingPrice !== '' ? undefined : 'Enter a valid cost price.',
      sellingPrice: Number(form.sellingPrice) >= 0 && form.sellingPrice !== '' ? undefined : 'Enter a selling price.',
      stock: !product && Number(form.stock) >= 0 && Number.isInteger(Number(form.stock)) ? undefined : (!product ? 'Starting quantity cannot be negative.' : undefined),
      barcode: barcodeMatch ? `This barcode already belongs to ${barcodeMatch.name}.` : undefined,
    }
    if (nextErrors.name || nextErrors.categoryId || nextErrors.buyingPrice || nextErrors.sellingPrice || nextErrors.stock || nextErrors.barcode) {
      setErrors(nextErrors)
      return
    }
    const loss = selling < buying
    if (loss && !window.confirm(`The selling price is lower than the cost price. You will lose ${formatCurrency(buying - selling)} per ${form.unit}. Save anyway?`)) return
    setLoading(true)
    try {
      const data = {
        name: form.name.trim(),
        brand: form.brand || undefined,
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        categoryId: form.categoryId || undefined,
        buyingPrice: parseFloat(String(form.buyingPrice)) || 0,
        sellingPrice: parseFloat(String(form.sellingPrice)),
        ...(product ? {} : { stock: Number(form.stock) }),
        minStock: Number(form.minStock),
        unit: form.unit,
        volume: form.volume === '' ? undefined : Number(form.volume),
        volumeUnit: form.volumeUnit || undefined,
        abv: form.abv === '' ? undefined : Number(form.abv),
        countryOfOrigin: form.countryOfOrigin || undefined,
        unitsPerPack: form.unitsPerPack === '' ? undefined : Number(form.unitsPerPack),
        preferredSupplierId: form.preferredSupplierId || undefined,
        confirmLoss: loss,
      }
      if (product) {
        await updateProduct(product.id, data as Parameters<typeof updateProduct>[1])
        toast.success('Product changes saved.')
      } else {
        await createProduct(data as Parameters<typeof createProduct>[0])
        toast.success('Product created')
      }
      closeEditor()
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
    <div className="mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
          <button type="button" onClick={closeEditor} className="ml-4 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" />Cancel</button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="border-b bg-card px-5 py-3 sm:px-6"><ol className="grid grid-cols-5 gap-2" aria-label="Product setup progress">{steps.map((label, index) => <li key={label} className={cn('text-center text-xs', step === index + 1 ? 'font-semibold text-primary' : 'text-muted-foreground')}><span className={cn('mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border', step === index + 1 && 'border-primary bg-primary text-primary-foreground')}>{index + 1}</span>{label}</li>)}</ol></div>
          <div className="space-y-6 p-5 sm:p-6">
            {step === 1 && <section>
              <div className="mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /><div><h3 className="text-sm font-semibold">Product information</h3><p className="text-xs text-muted-foreground">Tell your team what this item is and how it is sold.</p></div></div>
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
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><FieldLabel>Brand</FieldLabel><input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Johnnie Walker" className={inputCls} /></div>
                  <div><FieldLabel>Category</FieldLabel><div className="flex gap-2"><input list="product-category-options" value={categoryLabel(availableCategories.find((item) => item.id === form.categoryId) ?? { id: '', name: '' })} onChange={(event) => { const selected = selectableCategories.find((item) => categoryLabel(item) === event.target.value); if (selected) { set('categoryId', selected.id); setErrors((current) => ({ ...current, categoryId: undefined })) } }} placeholder="Search categories…" aria-invalid={Boolean(errors.categoryId)} className={cn(inputCls, errors.categoryId && 'border-destructive')} /><datalist id="product-category-options">{selectableCategories.map((item) => <option key={item.id} value={categoryLabel(item)} />)}</datalist><button type="button" onClick={() => setCategoryDialogOpen(true)} className="shrink-0 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary">+ Add</button></div>{errors.categoryId && <p className="mt-1 text-xs text-destructive">{errors.categoryId}</p>}</div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div><FieldLabel>Bottle or package size</FieldLabel><input type="number" min="0" step="0.01" value={form.volume} onChange={(e) => set('volume', e.target.value)} placeholder="750" className={inputCls} /></div>
                  <div><FieldLabel>Volume unit</FieldLabel><select value={form.volumeUnit} onChange={(e) => set('volumeUnit', e.target.value)} className={inputCls}>{VOLUME_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></div>
                  <div><FieldLabel>How this product is sold</FieldLabel><select value={form.unit} onChange={(e) => set('unit', e.target.value)} className={inputCls}>{SELLING_UNITS.map((unit) => <option key={unit} value={unit}>{unit[0].toUpperCase() + unit.slice(1)}</option>)}{product && !SELLING_UNITS.includes(form.unit) && <option value={form.unit}>{form.unit}</option>}</select></div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <FieldLabel>Product code (SKU)</FieldLabel><p className="mb-1 text-xs text-muted-foreground">A unique code used by your shop to identify this product. Leave it blank and the system will create one.</p>
                <input
                  id="product-sku"
                  type="text"
                      placeholder="e.g. JWB-750"
                  value={form.sku}
                  onChange={(e) => set('sku', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                    <FieldLabel>Barcode number</FieldLabel><p className="mb-1 text-xs text-muted-foreground">Scan the barcode on the bottle or type the number printed below it.</p>
                <div className="flex gap-2">
                  <input
                    id="product-barcode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Scan or enter barcode"
                    value={form.barcode}
                    onChange={(e) => void checkBarcode(e.target.value)}
                    onPaste={(e) => { e.preventDefault(); void checkBarcode(e.clipboardData.getData('text')) }}
                    aria-invalid={Boolean(errors.barcode)}
                    className={cn(inputCls, errors.barcode && 'border-destructive')}
                  />
                  <button type="button" onClick={() => setShowPhoneScanner(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-semibold hover:border-[#f9b21d] hover:bg-[#fff8e6] dark:hover:bg-[#2a2111]"><Smartphone className="h-4 w-4" /> Pair phone</button>
                </div>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Barcode className="h-3.5 w-3.5" /> USB scanner ready. You can also pair your phone or enter the printed number.</p>
                    {errors.barcode && <p role="alert" className="mt-1 text-xs text-destructive">{errors.barcode}</p>}
                    {barcodeMatch && <button type="button" onClick={() => router.push(`/dashboard/products/${barcodeMatch.id}`)} className="mt-1 text-xs font-medium text-primary hover:underline">View existing product</button>}
              </div>
                </div>
                <details className="mt-4 rounded-md border bg-background px-3 py-2"><summary className="cursor-pointer text-sm font-medium">More product details</summary><div className="mt-3 grid gap-4 sm:grid-cols-3"><div><FieldLabel>Alcohol percentage (ABV)</FieldLabel><input type="number" min="0" max="100" step="0.1" value={form.abv} onChange={(e) => set('abv', e.target.value)} placeholder="40" className={inputCls} /></div><div><FieldLabel>Country of origin</FieldLabel><input value={form.countryOfOrigin} onChange={(e) => set('countryOfOrigin', e.target.value)} placeholder="e.g. Scotland" className={inputCls} /></div><div><FieldLabel>Units per pack/carton</FieldLabel><input type="number" min="1" step="1" value={form.unitsPerPack} onChange={(e) => set('unitsPerPack', e.target.value)} placeholder="1" className={inputCls} /></div></div></details>
                <div className="mt-4">
                  <FieldLabel>Description</FieldLabel>
                  <textarea rows={2} placeholder="Optional product description" value={form.description} onChange={(e) => set('description', e.target.value)} className={cn(inputCls, 'resize-y')} />
                </div>
                <div className="mt-4">
                  <FieldLabel>Product image</FieldLabel>
                  <div className="flex gap-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 text-muted-foreground">
                      {form.imageUrl ? <Image src={form.imageUrl} alt="Product preview" width={80} height={80} unoptimized className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5" />}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2"><input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void handleImageSelection(e.target.files?.[0])} className="sr-only" /><button type="button" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} className="inline-flex w-fit items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"><Upload className="h-4 w-4" />{uploadingImage ? 'Uploading…' : 'Upload from computer'}</button><input type="url" placeholder="Or paste an image URL" value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} className={inputCls} /></div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">Upload a JPG, PNG or WebP image up to 5 MB. Large images will be optimized automatically.</p>
                </div>
              </div>
              {categoryDialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Create category</h3><button type="button" onClick={() => setCategoryDialogOpen(false)} className="text-muted-foreground">×</button></div><label className="mt-4 block text-sm font-medium">Category name<input autoFocus value={newCategory.name} onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))} className={`mt-1 ${inputCls}`} /></label><label className="mt-4 block text-sm font-medium">Parent category <span className="font-normal text-muted-foreground">(optional)</span><select value={newCategory.parentCategoryId} onChange={(event) => setNewCategory((current) => ({ ...current, parentCategoryId: event.target.value }))} className={`mt-1 ${inputCls}`}><option value="">No parent</option>{selectableCategories.map((item) => <option key={item.id} value={item.id}>{categoryLabel(item)}</option>)}</select></label><label className="mt-4 block text-sm font-medium">Description <span className="font-normal text-muted-foreground">(optional)</span><textarea value={newCategory.description} onChange={(event) => setNewCategory((current) => ({ ...current, description: event.target.value }))} className={`mt-1 ${inputCls}`} /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCategoryDialogOpen(false)} className="rounded-md border px-3 py-2 text-sm">Cancel</button><button type="button" onClick={addCategory} disabled={creatingCategory || !newCategory.name.trim()} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{creatingCategory ? 'Creating…' : 'Create category'}</button></div></div></div>}
            </section>}

            {step === 2 && <section className="rounded-lg border bg-muted/20 p-5"><div className="mb-3 flex items-center gap-2"><Barcode className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Identification and image</h3></div><p className="text-sm text-muted-foreground">Your product code is generated automatically when you save if it is blank.</p><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Product code</dt><dd className="mt-1 font-medium">{form.sku || 'Generated automatically on save'}</dd></div><div><dt className="text-xs text-muted-foreground">Barcode number</dt><dd className="mt-1">{form.barcode || 'No barcode provided'}</dd></div></dl><p className="mt-5 text-xs text-muted-foreground">Use Back to edit these details.</p></section>}

            {step === 3 && <section>
              <div className="mb-3 flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Pricing</h3></div>
              <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
              <div>
                    <FieldLabel>Cost price</FieldLabel><p className="mb-1 text-xs text-muted-foreground">How much you paid for one bottle or unit.</p>
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
                    <FieldLabel required>Selling price</FieldLabel><p className="mb-1 text-xs text-muted-foreground">How much the customer will pay for one bottle or unit.</p>
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
                <div className={cn('mt-4 rounded-md border px-3 py-2.5 text-sm', margin >= 0 ? 'border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.06)]' : 'border-destructive/25 bg-destructive/5')}>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Estimated profit</span><span className={cn('font-semibold tabular-nums', margin >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive')}>{formatCurrency(margin)}</span></div><p className="mt-1 text-xs">{margin >= 0 ? `Profit per ${form.unit}: ${formatCurrency(margin)} · Profit margin: ${marginPercent.toFixed(1)}%` : `You will lose ${formatCurrency(Math.abs(margin))} each time this product is sold.`}</p>
                </div>
              </div>
            </section>}

            {step === 4 && <section>
              <div className="mb-3 flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /><div><h3 className="text-sm font-semibold">Stock information</h3><p className="text-xs text-muted-foreground">Track quantities in the way your shop sells them.</p></div></div>
              <div className="rounded-lg border bg-muted/20 p-4 sm:p-5">
                <p className="mb-4 text-xs text-muted-foreground">Set the opening quantity and the level at which this product should be flagged for reorder.</p>
                <div className="grid gap-4 sm:grid-cols-3">
              <div>
                    <FieldLabel>{product ? 'Current stock' : 'Starting quantity'}</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => set('stock', e.target.value)} readOnly={Boolean(product)}
                  className={cn(inputCls, product && 'bg-muted')}
                />
                <p className="mt-1 text-xs text-muted-foreground">{product ? 'Use Adjust stock to record a stock movement.' : 'How many bottles, cans, cartons or units you currently have.'}</p>
                {product && <button type="button" onClick={() => router.push(`/dashboard/inventory?productId=${product.id}`)} className="mt-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary">Adjust stock</button>}
              </div>
              <div>
                    <FieldLabel>Low-stock alert level</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => set('minStock', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                    <FieldLabel>Stock preview</FieldLabel><p className="rounded-md border bg-muted/30 px-3 py-2 text-sm" aria-readonly="true">{form.stock} {form.unit === 'pcs' ? 'piece' : form.unit}{Number(form.stock) === 1 ? '' : 's'} available</p>
              </div>
                </div>
              </div>
            </section>}

            {step === 5 && <section className="rounded-lg border bg-muted/20 p-5"><h3 className="text-base font-semibold">Review product</h3><p className="mt-1 text-sm text-muted-foreground">Check the details before saving.</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Product</dt><dd className="font-semibold">{form.name || 'Not provided'}</dd></div><div><dt className="text-muted-foreground">Category</dt><dd>{categoryLabel(availableCategories.find((item) => item.id === form.categoryId) ?? { id: '', name: '' }) || 'Not provided'}</dd></div><div><dt className="text-muted-foreground">Product code</dt><dd>{form.sku || 'Generated on save'}</dd></div><div><dt className="text-muted-foreground">Selling unit</dt><dd className="capitalize">{form.unit}</dd></div><div><dt className="text-muted-foreground">Selling price</dt><dd>{form.sellingPrice ? formatCurrency(form.sellingPrice) : 'Not provided'}</dd></div><div><dt className="text-muted-foreground">Starting stock</dt><dd>{product ? `${product.stock} ${product.unit}` : `${form.stock} ${form.unit}`}</dd></div></dl>{selling < buying && <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Warning: this product will be sold below cost.</p>}</section>}
          </div>

          <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-4 sm:px-6">
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Check className="h-3.5 w-3.5 text-muted-foreground" />Unsaved changes</p>
            <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={closeEditor}
                className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Cancel
            </button>
            {step > 1 && <button type="button" onClick={() => setStep((current) => current - 1)} className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary">Back</button>}
            {step < 5 && <button type="button" onClick={continueStep} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Continue</button>}
            {step === 5 && <button
              type="submit"
              disabled={loading || uploadingImage}
              className={cn(
                'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                  'hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60'
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {product ? 'Save changes' : 'Save product'}
            </button>}
            </div>
          </div>
        </form>
      </div>
      <WirelessScannerPairing
        open={showPhoneScanner}
        onClose={() => setShowPhoneScanner(false)}
        onBarcode={(barcode) => {
          setShowPhoneScanner(false)
          void checkBarcode(barcode)
        }}
      />
    </div>
  )
}
