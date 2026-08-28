'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Search, Plus, Pencil, Users, X, Eye, Trash2, LockKeyhole } from 'lucide-react'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'
import type { Customer } from '@/lib/db/schema'
import { useCustomersStore, OptimisticItem } from '@/lib/stores/customers-store'
import { createCustomer, deleteCustomer } from '@/app/actions/customers'
import { useDebounce } from 'use-debounce'
import { notify } from '@/lib/notify'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { GmailMark, GoogleMapsMark, PhoneMark } from '@/components/ui/contact-marks'

interface CustomersClientProps {
  initialCustomers: Customer[]
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>(initialCustomers)
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [debouncedSearch] = useDebounce(search, 250)
  const optimistic = useCustomersStore((s) => s.optimistic)
  const canonical = useCustomersStore((s) => s.canonical)
  const setCanonical = useCustomersStore((s) => s.setCanonical)
  useEffect(() => setCanonical(initialCustomers), [initialCustomers, setCanonical])

  // Merge initial server customers with optimistic items (optimistic first)
  useEffect(() => {
    const mappedOptimistic = optimistic.map((o) => ({
      id: o.tempId,
      name: o.name,
      phone: o.phone ?? null,
      email: o.email ?? null,
      address: o.address ?? null,
      createdAt: o.createdAt,
      // @ts-ignore allow optimistic flag for rendering
      optimistic: true,
      // @ts-ignore status
      status: o.status,
    }))
    // Filter out any server customers that were replaced (same id)
    const serverItems = [...canonical, ...initialCustomers].filter((c, index, items) => items.findIndex((x) => x.id === c.id) === index)
    const serverFiltered = serverItems.filter((c) => !mappedOptimistic.some((m) => m.id === c.id))
    setCustomers([...mappedOptimistic, ...serverFiltered])
  }, [initialCustomers, canonical, optimistic])

  const filtered = customers.filter(
    (c) =>
      !debouncedSearch || c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (c.phone ?? '').includes(debouncedSearch) || (c.email ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const toTitleCase = (value: string) => value.toLocaleLowerCase().replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase())
  const displayName = (value: string) => toTitleCase(value.trim())
  const isMaskedName = (value: string) => /[•*]{2,}/.test(value)
  const initials = (value: string) => value.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase() || '?'

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteCustomer(deleteTarget.id)
      setCustomers((items) => items.filter((item) => item.id !== deleteTarget.id))
      useCustomersStore.getState().setCanonical(canonical.filter((item) => item.id !== deleteTarget.id))
      notify.success('Customer deleted')
      setDeleteTarget(null)
      router.refresh()
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not delete customer')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="overflow-hidden rounded-xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:bg-card/80 dark:shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 bg-slate-50/60 p-3 dark:bg-white/[0.015] sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Search customers"
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.75rem', paddingRight: '2.5rem' }}
              className="h-11 w-full rounded-xl border border-border bg-card py-2 text-sm text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-[#121212] dark:focus:border-[#ffd60a]/50 dark:focus:ring-[#ffd60a]/10"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground sm:ml-1 sm:mr-auto" aria-live="polite">
            Showing {filtered.length} of {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
          </span>
          <Link
            href="/dashboard/customers/new"
            className="inline-flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Link>
        </div>

        {/* Contact directory */}
        {filtered.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center border-t border-dashed border-border bg-card/70 px-6 py-12 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15"><Users className="h-6 w-6" /></span>
            <p className="text-base font-semibold">{search ? 'No results match your search' : 'No customers yet'}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {search ? 'Try a different search term.' : 'Add a customer once, then select them again during checkout for faster service.'}
            </p>
            {!search && <Link href="/dashboard/customers/new" className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" />Add your first customer</Link>}
          </div>
        ) : (
          <section className="border-t border-border dark:border-white/[0.07]">
            <div className="hidden min-h-11 grid-cols-[minmax(220px,1.4fr)_minmax(220px,1.4fr)_minmax(140px,.8fr)_minmax(160px,1fr)_100px_104px] items-center gap-4 border-b border-border bg-secondary/40 px-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground dark:border-white/[0.07] dark:bg-white/[0.025] lg:grid">
              <span>Name</span><span>Email</span><span>Phone</span><span>Location</span><span>Added</span><span className="sr-only">Actions</span>
            </div>
            <div className="divide-y divide-border dark:divide-white/[0.07]">
              {filtered.map((c) => (
                <article key={c.id} className={`group grid min-h-[68px] grid-cols-[minmax(0,1fr)_104px] items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50 dark:hover:bg-white/[0.035] lg:grid-cols-[minmax(220px,1.4fr)_minmax(220px,1.4fr)_minmax(140px,.8fr)_minmax(160px,1fr)_100px_104px] lg:gap-4 lg:px-5 lg:py-3.5 ${ (c as any).optimistic ? 'opacity-75' : ''}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff3bd] text-sm font-bold text-[#765800] dark:bg-[#ffd60a]/15 dark:text-[#ffe35c]">
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-foreground">
                        <span className="truncate">{displayName(c.name)}</span>
                        {isMaskedName(c.name) && <Tooltip><TooltipTrigger asChild><span tabIndex={0} className="shrink-0 text-muted-foreground"><LockKeyhole className="h-3 w-3" aria-label="Partially hidden name" /></span></TooltipTrigger><TooltipContent>Name appears partially hidden for privacy</TooltipContent></Tooltip>}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground lg:hidden">{c.email || c.phone || 'No contact details'}</p>
                    </div>
                  </div>
                  <div className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground lg:flex">
                    {c.email ? <><GmailMark /><a href={`mailto:${c.email}`} className="truncate hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{c.email}</a></> : <span>—</span>}
                  </div>
                  <div className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground lg:flex">
                    {c.phone ? <><PhoneMark /><a href={`tel:${c.phone}`} className="truncate hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{c.phone}</a></> : <span>—</span>}
                  </div>
                  <div className="hidden min-w-0 items-center gap-1.5 text-sm text-muted-foreground lg:flex">
                    {c.address ? <><GoogleMapsMark /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`} target="_blank" rel="noreferrer" className="truncate hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{c.address}</a></> : <span>—</span>}
                  </div>
                  <span className="hidden text-right text-[11px] text-muted-foreground lg:block">{formatDate(c.createdAt)}</span>
                  <div className="flex items-center justify-end">
                    {(c as any).optimistic && (c as any).status === 'pending' && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" />
                    )}
                    {(c as any).optimistic && (c as any).status === 'failed' && (
                      <span className="mr-2 text-xs text-destructive">Failed</span>
                    )}
                    <div className="flex items-center rounded-lg border border-border bg-background/70 p-0.5 shadow-sm dark:border-white/10 dark:bg-white/[0.025]">
                      <Tooltip><TooltipTrigger asChild><Link href={`/dashboard/customers/${c.id}?mode=view`} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`View ${displayName(c.name)}`}><Eye className="h-3.5 w-3.5" /></Link></TooltipTrigger><TooltipContent>View details</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Link href={`/dashboard/customers/${c.id}`} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Edit ${displayName(c.name)}`}><Pencil className="h-3.5 w-3.5" /></Link></TooltipTrigger><TooltipContent>Edit customer</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><button type="button" onClick={() => setDeleteTarget(c)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-400/10 dark:hover:text-red-300" aria-label={`Delete ${displayName(c.name)}`}><Trash2 className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent>Delete customer</TooltipContent></Tooltip>
                    </div>
                  </div>
                {/* Retry button for failed optimistic saves */}
                {(c as any).optimistic && (c as any).status === 'failed' && (
                  <div className="col-span-full flex items-center gap-2 pb-2 pl-[52px] md:pl-0">
                      <button disabled={(c as any).status === 'pending'}
                      onClick={async () => {
                        // retry: call server action and update store
                        const opt = optimistic.find((o) => o.tempId === c.id) as OptimisticItem | undefined
                        if (!opt) return
                        try {
                          useCustomersStore.getState().addOptimistic({ ...opt, status: 'pending' })
                          const res = await createCustomer({ name: opt.name, phone: opt.phone || undefined, email: opt.email || undefined, address: opt.address || undefined })
                          useCustomersStore.getState().replaceOptimistic(opt.tempId, res)
                        } catch (err) {
                          useCustomersStore.getState().markFailed(opt.tempId)
                        }
                      }}
                      className="rounded-md border px-3 py-1 text-sm"
                    >
                      <Loader2 className="mr-1 inline h-3 w-3" />Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => useCustomersStore.getState().removeOptimistic(c.id)}
                      className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                )}
                </article>
              ))}
            </div>
          </section>
        )}

      </div>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this customer?</AlertDialogTitle><AlertDialogDescription>This permanently removes {deleteTarget ? displayName(deleteTarget.name) : 'this customer'} from the customer directory. Existing sales records are not changed.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete() }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? 'Deleting…' : 'Delete customer'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
