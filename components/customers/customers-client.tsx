'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Search, Plus, Pencil, Users, Phone, Mail, MapPin, Loader2 } from 'lucide-react'
import type { Customer } from '@/lib/db/schema'
import { useCustomersStore, OptimisticItem } from '@/lib/stores/customers-store'
import { createCustomer } from '@/app/actions/customers'
import { useDebounce } from 'use-debounce'

interface CustomersClientProps {
  initialCustomers: Customer[]
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
  const [customers, setCustomers] = useState<any[]>(initialCustomers)
  const [search, setSearch] = useState('')
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

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input aria-label="Search customers"
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
          <Link
            href="/dashboard/customers/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Link>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-6 w-6" /></span>
            <p className="text-base font-semibold">{search ? 'No matching customers' : 'Start your customer list'}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {search ? 'Try a different search term.' : 'Add a customer once, then select them again during checkout for faster service.'}
            </p>
            {!search && <Link href="/dashboard/customers/new" className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" />Add your first customer</Link>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div key={c.id} className={`rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${ (c as any).optimistic ? 'opacity-90' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#fff3bd] text-sm font-semibold text-[#765800]">
                      {c.name ? c.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">Since {formatDate(c.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2 items-center">
                    {(c as any).optimistic && (c as any).status === 'pending' && (
                      <div className="mr-2 flex items-center gap-2 text-xs text-muted-foreground"><svg className="h-4 w-4 animate-spin text-muted-foreground" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>Saving…</div>
                    )}
                    {(c as any).optimistic && (c as any).status === 'failed' && (
                      <div className="mr-2 flex items-center gap-2 text-xs text-destructive">Save failed</div>
                    )}
                    <Link
                      href={`/dashboard/customers/${c.id}`}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-sm text-muted-foreground" aria-busy={(c as any).status === 'pending'}>
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                  {!c.phone && !c.email && !c.address && <span className="italic">No contact details</span>}
                </div>
                {/* Retry button for failed optimistic saves */}
                {(c as any).optimistic && (c as any).status === 'failed' && (
                  <div className="mt-3 flex items-center gap-2">
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
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {filtered.length} of {customers.length} customers
        </p>
      </div>
    </>
  )
}
