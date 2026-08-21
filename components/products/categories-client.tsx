'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Boxes, Check, ExternalLink, Grid2X2, List, Pencil, Plus, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createCategory, setCategoryActive, updateCategory } from '@/app/actions/categories'

type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  parentCategoryId: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  productCount: number
}

type CategoryForm = {
  name: string
  description: string
  parentCategoryId: string
  imageUrl?: string | null
}

function CategoryImage({ src, name, compact = false, priority = false }: { src: string | null; name: string; compact?: boolean; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed
  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br from-[#fff8e8] to-[#f8ebc7] ${compact ? 'text-[#9a6900]' : 'text-[#8a6500]'}`}>
      {showImage && <Image src={src!} alt={`${name} category`} fill sizes={compact ? '36px' : '(min-width: 1280px) 280px, 50vw'} priority={priority} className={`object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />}
      {!loaded && <span className="absolute inset-0 animate-pulse bg-[#fff3d4]" aria-hidden="true" />}
      {(!showImage || failed) && <span className="absolute inset-0 flex items-center justify-center"><Boxes className={compact ? 'h-4 w-4' : 'h-10 w-10'} strokeWidth={1.5} /><span className="sr-only">No image for {name}</span></span>}
    </div>
  )
}

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter()
  const [categories] = useState(initialCategories)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const filtered = useMemo(
    () => categories.filter((item) => (item.name || '').toLowerCase().includes(search.toLowerCase())),
    [categories, search],
  )
  const parentLabel = (id: string | null) => {
    if (!id) return { label: 'Top-level category', missing: false }
    const parent = categories.find((item) => item.id === id)
    return parent ? { label: `Subcategory of ${parent.name}`, missing: false } : { label: 'Parent category missing', missing: true }
  }

  const save = async (form: CategoryForm) => {
    try {
      if (editing?.id) {
        await updateCategory(editing.id, { ...form, parentCategoryId: form.parentCategoryId || null })
        toast.success('Category updated')
      } else {
        await createCategory({ ...form, parentCategoryId: form.parentCategoryId || null })
        toast.success('Category created')
      }
      setEditing(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save category')
    }
  }

  const emptyCategory = (): Category => ({
    id: '', name: '', slug: '', description: '', imageUrl: null,
    parentCategoryId: null, isActive: true, createdAt: new Date(), updatedAt: new Date(), productCount: 0,
  })

  return (
    <div className="space-y-5 font-sans [font-feature-settings:'ss01','cv02','cv03']">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Total categories" value={categories.length} />
        <Summary label="Active categories" value={categories.filter((item) => item.isActive).length} tone="green" />
        <Summary label="Categories in use" value={categories.filter((item) => item.productCount > 0).length} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" aria-label="Search categories" className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
        <button onClick={() => setEditing(emptyCategory())} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Create category</button>
      </div>

      <div className="flex items-center justify-end">
        <div className="flex items-center rounded-md border bg-white p-0.5" aria-label="Category layout">
          <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label="Grid view" className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-[#fff3bd] text-[#765800]' : 'text-muted-foreground hover:bg-muted'}`}><Grid2X2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} aria-label="List view" className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-[#fff3bd] text-[#765800]' : 'text-muted-foreground hover:bg-muted'}`}><List className="h-4 w-4" /></button>
        </div>
      </div>

      {viewMode === 'grid' ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {filtered.map((item, index) => {
          const href = `/dashboard/products/categories/${item.id}`
          const incomplete = !item.name.trim()
          const parent = parentLabel(item.parentCategoryId)
          return <article key={item.id} className={`group flex min-h-[220px] flex-col overflow-hidden rounded-xl border bg-white shadow-[0_1px_3px_rgba(16,24,40,.05)] transition-shadow hover:shadow-[0_6px_16px_rgba(16,24,40,.08)] ${incomplete ? 'border-[#f2cf70] bg-[#fffdf5]' : 'border-[#e4e7ec] hover:border-[#d8b92e]'}`}>
            {incomplete ? <button type="button" onClick={() => setEditing(item)} className="block text-left" aria-label="Set up unnamed category"><div className="relative h-24 overflow-hidden"><CategoryImage src={item.imageUrl} name="Unnamed category" priority={index < 5} /><span className="absolute right-2 top-2 rounded-full bg-[#fff3bd] px-2 py-1 text-[11px] font-semibold text-[#765800]">Needs setup</span></div><div className="p-3"><h2 className="!text-[15px] !leading-tight font-semibold text-[#765800]">Unnamed category — needs setup</h2><p className="mt-1 text-xs text-muted-foreground">Add a name to make this category usable.</p></div></button> : <Link href={href} className="group block" aria-label={`View category ${item.name}`}>
              <div className="relative h-24 overflow-hidden"><CategoryImage src={item.imageUrl} name={item.name} priority={index < 5} /><span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[11px] font-semibold ${item.isActive ? 'bg-[#edf7ef] text-[#28743c]' : 'bg-white/90 text-muted-foreground'}`}>{item.isActive ? 'Active' : 'Archived'}</span></div>
              <div className="p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="!text-[15px] !leading-tight font-semibold text-[#101828] group-hover:text-primary">{item.name}</h2><p className={`mt-1 truncate text-xs ${parent.missing ? 'font-medium text-amber-700' : 'text-muted-foreground'}`}>{parent.label}</p></div><ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" /></div><div className="mt-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.productCount > 0 ? 'bg-[#fff3bd] text-[#765800]' : 'bg-slate-100 text-slate-500'}`}>{item.productCount > 0 ? `${item.productCount} ${item.productCount === 1 ? 'product' : 'products'}` : 'No products yet'}</span></div></div>
            </Link>}
            <div className="mt-auto flex items-center justify-between border-t border-[#eef0f3] bg-[#fafbfc] px-3 py-2.5">{incomplete ? <button type="button" onClick={() => setEditing(item)} className="text-xs font-semibold text-amber-700 hover:text-primary">Set up category</button> : <Link href={href} className="text-xs font-semibold text-[#667085] hover:text-primary">View category</Link>}<div className="flex items-center gap-1"><button onClick={() => setEditing(item)} className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground" aria-label={`Edit ${item.name || 'unnamed category'}`} title="Edit category"><Pencil className="h-3.5 w-3.5" /></button>{item.slug !== 'uncategorised' && <button onClick={async () => { try { await setCategoryActive(item.id, !item.isActive); router.refresh() } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update category') } }} className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground" aria-label={item.isActive ? `Archive ${item.name || 'unnamed category'}` : `Restore ${item.name || 'unnamed category'}`} title={item.isActive ? 'Archive category' : 'Restore category'}>{item.isActive ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}</button>}</div></div>
          </article>
        })}
      </div> : <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-muted-foreground"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Products</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {filtered.map((item) => {
              const href = `/dashboard/products/categories/${item.id}`
              return <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={href} className="group flex items-center gap-3" aria-label={`View category ${item.name}`}>
                    <div className="h-9 w-9 overflow-hidden rounded-md"><CategoryImage src={item.imageUrl} name={item.name} compact /></div>
                    <div><p className={`font-semibold group-hover:text-primary ${!item.name.trim() ? 'text-amber-700' : ''}`}>{item.name.trim() || 'Unnamed category — needs setup'}</p><p className="text-xs text-muted-foreground">{item.name.trim() ? `/${item.slug}` : 'Needs setup'}</p></div>
                  </Link>
                </td>
                <td className={`px-4 py-3 ${parentLabel(item.parentCategoryId).missing ? 'font-medium text-amber-700' : 'text-muted-foreground'}`}>{parentLabel(item.parentCategoryId).label}</td>
                <td className="px-4 py-3 font-medium">{item.productCount}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.isActive ? 'bg-[#edf7ef] text-[#28743c]' : 'bg-muted text-muted-foreground'}`}>{item.isActive ? 'Active' : 'Archived'}</span></td>
                <td className="px-4 py-3 text-right">
                  <Link href={href} className="rounded p-2 text-muted-foreground hover:bg-muted" aria-label={`View category ${item.name}`}><ExternalLink className="inline h-4 w-4" /></Link>
                  <button onClick={() => setEditing(item)} className="rounded p-2 text-muted-foreground hover:bg-muted" aria-label={`Edit ${item.name}`}><Pencil className="inline h-4 w-4" /></button>
                  {item.slug !== 'uncategorised' && <button onClick={async () => { try { await setCategoryActive(item.id, !item.isActive); router.refresh() } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update category') } }} className="rounded p-2 text-muted-foreground hover:bg-muted" aria-label={item.isActive ? `Archive ${item.name}` : `Restore ${item.name}`}>{item.isActive ? <RotateCcw className="inline h-4 w-4" /> : <Check className="inline h-4 w-4" />}</button>}
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>}
      {filtered.length === 0 && <div className="rounded-xl border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">No categories found.</div>}
      {editing && <CategoryModal category={editing.id ? editing : null} categories={categories} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  )
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: 'green' }) {
  return <div className="rounded-lg border bg-white px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-bold ${tone === 'green' ? 'text-[#28743c]' : ''}`}>{value}</p></div>
}

function CategoryModal({ category, categories, onClose, onSave }: { category: Category | null; categories: Category[]; onClose: () => void; onSave: (form: CategoryForm) => Promise<void> }) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [parentCategoryId, setParentCategoryId] = useState(category?.parentCategoryId ?? '')
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const nameError = name.trim().length === 0 ? 'Category name is required' : name.trim().length < 2 ? 'Category name must be at least 2 characters' : null
  const inputClass = 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
  const uploadImage = async (file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('Image is too large. Choose an image smaller than 5 MB.')
    setUploading(true)
    try {
      const body = new FormData(); body.append('file', file)
      const response = await fetch('/api/products/images', { method: 'POST', body })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Image upload failed')
      setImageUrl(result.url); toast.success('Category image uploaded')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Image upload failed') } finally { setUploading(false) }
  }
  const submit = async () => { setSaving(true); try { await onSave({ name, description, parentCategoryId, imageUrl: imageUrl || null }) } finally { setSaving(false) } }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={(event) => { event.preventDefault(); if (nameError) return; if (step < 3) setStep((current) => current + 1); else void submit() }} className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-xl"><div className="border-b px-5 py-4"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Step {step} of 3</p><h2 className="mt-1 text-lg font-bold">{category ? 'Edit category' : 'Create category'}</h2><p className="mt-1 text-sm text-muted-foreground">{step === 1 ? 'Name your category.' : step === 2 ? 'Place it in your catalogue.' : 'Review before saving.'}</p></div><button type="button" onClick={onClose} className="text-xl text-muted-foreground" aria-label="Close">×</button></div><div className="mt-4 grid grid-cols-3 gap-1">{[1, 2, 3].map((item) => <span key={item} className={`h-1 rounded-full ${item <= step ? 'bg-primary' : 'bg-muted'}`} />)}</div></div><div className="p-5">{step === 1 && <label className="block text-sm font-medium">Category name<input required autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Spirits" aria-invalid={Boolean(nameError)} className={`${inputClass} ${nameError ? 'border-destructive' : ''}`} />{nameError && <span className="mt-1 block text-xs font-medium text-destructive">{nameError}</span>}</label>}{step === 2 && <div className="space-y-4"><label className="block text-sm font-medium">Parent category <span className="font-normal text-muted-foreground">(optional)</span><select value={parentCategoryId} onChange={(event) => setParentCategoryId(event.target.value)} className={inputClass}><option value="">Top-level category</option>{categories.filter((item) => item.isActive && item.id !== category?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-medium">Description <span className="font-normal text-muted-foreground">(optional)</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Help your team understand this group." className={inputClass} /></label><div><label className="block text-sm font-medium">Category image <span className="font-normal text-muted-foreground">(optional)</span></label><div className="mt-2 flex items-center gap-3"><div className="h-16 w-16 overflow-hidden rounded-md bg-[#fff8e8]">{imageUrl ? <Image src={imageUrl} alt="Category preview" width={64} height={64} unoptimized className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[#9a6900]">#</span>}</div><div><input id="category-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(event.target.files?.[0])} className="sr-only" /><label htmlFor="category-image" className="cursor-pointer rounded-md border bg-background px-3 py-2 text-sm font-medium">{uploading ? 'Uploading…' : 'Upload image'}</label>{imageUrl && <button type="button" onClick={() => setImageUrl('')} className="ml-2 text-xs text-destructive">Remove</button>}</div></div></div></div>}{step === 3 && <div className="rounded-lg border bg-muted/30 p-4 text-sm"><p className="text-xs text-muted-foreground">Category name</p><p className="font-semibold">{name}</p><p className="mt-3 text-xs text-muted-foreground">Parent</p><p>{parentCategoryId ? categories.find((item) => item.id === parentCategoryId)?.name : 'Top-level category'}</p>{imageUrl && <Image src={imageUrl} alt="" width={80} height={80} unoptimized className="mt-3 h-20 w-20 rounded-md object-cover" />}{description && <><p className="mt-3 text-xs text-muted-foreground">Description</p><p>{description}</p></>}</div>}</div><div className="flex justify-between border-t bg-muted/20 px-5 py-4"><button type="button" onClick={step === 1 ? onClose : () => setStep((current) => current - 1)} className="rounded-md border bg-background px-3 py-2 text-sm font-medium">{step === 1 ? 'Cancel' : 'Back'}</button><button disabled={saving || uploading || Boolean(nameError)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : step === 3 ? 'Save category' : 'Continue'}</button></div></form></div>
}
