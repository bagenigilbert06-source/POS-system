'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, Check, ExternalLink, Grid2X2, List, Pencil, Plus, RotateCcw, Search } from 'lucide-react'
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

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter()
  const [categories] = useState(initialCategories)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const filtered = useMemo(
    () => categories.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search],
  )
  const parentName = (id: string | null) => categories.find((item) => item.id === id)?.name

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
    <div className="space-y-4">
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

      {viewMode === 'grid' ? <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,280px))] justify-start gap-3">
        {filtered.map((item) => {
          const href = `/dashboard/products/categories/${item.id}`
          return <article key={item.id} className="w-full overflow-hidden rounded-xl border bg-white shadow-sm hover:border-[#d8b92e]">
            <Link href={href} className="group block" aria-label={`View category ${item.name}`}>
              <div className="relative h-32 overflow-hidden bg-[#fff8e8]">{item.imageUrl ? <Image src={item.imageUrl} alt={`${item.name} category`} fill unoptimized className="object-cover" /> : <span className="flex h-full items-center justify-center text-3xl text-[#9a6900]">#</span>}<span className={`absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-semibold ${item.isActive ? 'bg-[#edf7ef] text-[#28743c]' : 'bg-white/90 text-muted-foreground'}`}>{item.isActive ? 'Active' : 'Archived'}</span></div>
              <div className="space-y-1.5 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold group-hover:text-primary">{item.name}</h2><p className="truncate text-xs text-muted-foreground">/{item.slug}</p></div><ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" /></div><p className="truncate text-xs text-muted-foreground">{parentName(item.parentCategoryId) ?? 'Top-level category'}</p><p className="text-sm font-semibold">{item.productCount} active {item.productCount === 1 ? 'product' : 'products'}</p></div>
            </Link>
            <div className="flex items-center justify-end gap-2 border-t px-3 py-2"><button onClick={() => setEditing(item)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Edit ${item.name}`}><Pencil className="h-3.5 w-3.5" />Edit</button>{item.slug !== 'uncategorised' && <button onClick={async () => { try { await setCategoryActive(item.id, !item.isActive); router.refresh() } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update category') } }} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={item.isActive ? `Archive ${item.name}` : `Restore ${item.name}`}>{item.isActive ? <><Archive className="h-3.5 w-3.5" />Archive</> : <><RotateCcw className="h-3.5 w-3.5" />Restore</>}</button>}</div>
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
                    <div className="h-9 w-9 overflow-hidden rounded-md bg-[#fff8e8]">{item.imageUrl ? <Image src={item.imageUrl} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-[#9a6900]">#</span>}</div>
                    <div><p className="font-semibold group-hover:text-primary">{item.name}</p><p className="text-xs text-muted-foreground">/{item.slug}</p></div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{parentName(item.parentCategoryId) ?? 'Top-level category'}</td>
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
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={(event) => { event.preventDefault(); if (step < 3) setStep((current) => current + 1); else void submit() }} className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-xl"><div className="border-b px-5 py-4"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Step {step} of 3</p><h2 className="mt-1 text-lg font-bold">{category ? 'Edit category' : 'Create category'}</h2><p className="mt-1 text-sm text-muted-foreground">{step === 1 ? 'Name your category.' : step === 2 ? 'Place it in your catalogue.' : 'Review before saving.'}</p></div><button type="button" onClick={onClose} className="text-xl text-muted-foreground" aria-label="Close">×</button></div><div className="mt-4 grid grid-cols-3 gap-1">{[1, 2, 3].map((item) => <span key={item} className={`h-1 rounded-full ${item <= step ? 'bg-primary' : 'bg-muted'}`} />)}</div></div><div className="p-5">{step === 1 && <label className="block text-sm font-medium">Category name<input required autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Spirits" className={inputClass} /></label>}{step === 2 && <div className="space-y-4"><label className="block text-sm font-medium">Parent category <span className="font-normal text-muted-foreground">(optional)</span><select value={parentCategoryId} onChange={(event) => setParentCategoryId(event.target.value)} className={inputClass}><option value="">Top-level category</option>{categories.filter((item) => item.isActive && item.id !== category?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-medium">Description <span className="font-normal text-muted-foreground">(optional)</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Help your team understand this group." className={inputClass} /></label><div><label className="block text-sm font-medium">Category image <span className="font-normal text-muted-foreground">(optional)</span></label><div className="mt-2 flex items-center gap-3"><div className="h-16 w-16 overflow-hidden rounded-md bg-[#fff8e8]">{imageUrl ? <Image src={imageUrl} alt="Category preview" width={64} height={64} unoptimized className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[#9a6900]">#</span>}</div><div><input id="category-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadImage(event.target.files?.[0])} className="sr-only" /><label htmlFor="category-image" className="cursor-pointer rounded-md border bg-background px-3 py-2 text-sm font-medium">{uploading ? 'Uploading…' : 'Upload image'}</label>{imageUrl && <button type="button" onClick={() => setImageUrl('')} className="ml-2 text-xs text-destructive">Remove</button>}</div></div></div></div>}{step === 3 && <div className="rounded-lg border bg-muted/30 p-4 text-sm"><p className="text-xs text-muted-foreground">Category name</p><p className="font-semibold">{name}</p><p className="mt-3 text-xs text-muted-foreground">Parent</p><p>{parentCategoryId ? categories.find((item) => item.id === parentCategoryId)?.name : 'Top-level category'}</p>{imageUrl && <Image src={imageUrl} alt="" width={80} height={80} unoptimized className="mt-3 h-20 w-20 rounded-md object-cover" />}{description && <><p className="mt-3 text-xs text-muted-foreground">Description</p><p>{description}</p></>}</div>}</div><div className="flex justify-between border-t bg-muted/20 px-5 py-4"><button type="button" onClick={step === 1 ? onClose : () => setStep((current) => current - 1)} className="rounded-md border bg-background px-3 py-2 text-sm font-medium">{step === 1 ? 'Cancel' : 'Back'}</button><button disabled={saving || uploading || (step === 1 && !name.trim())} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : step === 3 ? 'Save category' : 'Continue'}</button></div></form></div>
}
