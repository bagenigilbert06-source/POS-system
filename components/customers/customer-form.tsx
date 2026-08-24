"use client"

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCustomer, updateCustomer } from '@/app/actions/customers'
import { cn } from '@/lib/utils'
import { Check, Loader2, Phone } from 'lucide-react'
import type { Customer } from '@/lib/db/schema'
import { toast } from 'sonner'
import { broadcastCustomerCreated, useCustomersStore } from '@/lib/stores/customers-store'

interface CustomerFormProps {
  customer?: Customer
  onClose?: () => void
}

export function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    address: customer?.address ?? '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const closeEditor = () => {
    if (onClose) onClose()
    else router.push('/dashboard/customers')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting.current) return
    setError('')
    const name = form.name.trim()
    const phone = form.phone.replace(/[\s()-]/g, '')
    if (name.length < 2) { setError('Enter at least 2 characters for the name.'); return }
    if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) { setError('Enter a valid phone number.'); return }
    submitting.current = true
    setLoading(true)
    const data = {
      name,
      phone: form.phone.trim() || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
    }
    try {
      if (customer) {
        await updateCustomer(customer.id, data)
        toast.success('Customer updated')
        closeEditor()
      } else {
        // Optimistic instant UX using zustand store
        const tempId = (globalThis.crypto && (globalThis.crypto as any).randomUUID)
          ? (globalThis.crypto as any).randomUUID()
          : `tmp-${Date.now()}`

        const optimistic = {
          tempId,
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          createdAt: new Date().toISOString(),
          status: 'pending' as const,
        }

        useCustomersStore.getState().addOptimistic(optimistic)

        try {
          const res = await createCustomer(data)
          useCustomersStore.getState().replaceOptimistic(tempId, res)
          broadcastCustomerCreated(res)
          toast.success('Customer added')
          closeEditor()
        } catch (err) {
          useCustomersStore.getState().markFailed(tempId)
          throw err
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save customer'
      setError(message)
      toast.error(message)
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  const inputCls = cn(
    'w-full rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-3 py-2 text-sm text-[var(--dashboard-text)] outline-none shadow-[0_1px_2px_rgba(16,24,40,.03)]',
    'placeholder:text-muted-foreground',
    'focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'
  )

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_2px_8px_rgba(16,24,40,.05)]">
        <form onSubmit={handleSubmit} aria-describedby={error ? 'customer-form-error' : undefined}>
          <div className="p-5 sm:p-7">
            <div className="mb-6"><h2 className="text-lg font-semibold">Customer details</h2><p className="mt-1 text-sm text-muted-foreground">Name is required. Contact details help your team find customers during checkout.</p></div>
            <div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><label htmlFor="customer-name" className="mb-1.5 block text-sm font-medium">Full name <span className="text-destructive">*</span></label><input id="customer-name" type="text" required autoFocus placeholder="e.g. Jane Wanjiru" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></div><div><label htmlFor="customer-phone" className="mb-1.5 block text-sm font-medium">Phone number <span className="font-normal text-muted-foreground">(optional)</span></label><div className="relative"><Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input id="customer-phone" type="tel" inputMode="tel" placeholder="e.g. 0712 345 678" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={`${inputCls} pl-9`} /></div></div><div><label htmlFor="customer-email" className="mb-1.5 block text-sm font-medium">Email address <span className="font-normal text-muted-foreground">(optional)</span></label><input id="customer-email" type="email" placeholder="jane@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} /></div><div className="sm:col-span-2"><label htmlFor="customer-address" className="mb-1.5 block text-sm font-medium">Address <span className="font-normal text-muted-foreground">(optional)</span></label><input id="customer-address" type="text" placeholder="e.g. Westlands, Nairobi" value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} /></div></div>
            {error && <p id="customer-form-error" role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-5 py-4 sm:px-6">
            <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" aria-live="polite">
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />Saving securely…</> : <><Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" />Ready to use at the POS after saving.</>}
            </p>
            <button
              type="button"
              onClick={closeEditor}
              disabled={loading}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className={cn(
                'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
                'hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
              )}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Saving…' : customer ? 'Save changes' : 'Save customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
