'use client'

import { useState } from 'react'
import { createCustomer, updateCustomer } from '@/app/actions/customers'
import { cn } from '@/lib/utils'
import { Loader2, X } from 'lucide-react'
import type { Customer } from '@/lib/db/schema'
import { toast } from 'sonner'

interface CustomerFormProps {
  customer?: Customer
  onClose: () => void
}

export function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    address: customer?.address ?? '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
      }
      if (customer) {
        await updateCustomer(customer.id, data)
        toast.success('Customer updated')
      } else {
        await createCustomer(data)
        toast.success('Customer added')
      }
      onClose()
    } catch {
      toast.error('Failed to save customer')
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
      <div className="w-full max-w-md rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">
            {customer ? 'Edit Customer' : 'Add Customer'}
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
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Full name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Wanjiru"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone number</label>
              <input
                type="tel"
                placeholder="e.g. 0712 345 678"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email address</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Address</label>
              <input
                type="text"
                placeholder="e.g. Nairobi, Kenya"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

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
              {customer ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
