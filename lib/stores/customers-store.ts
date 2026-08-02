import { create } from 'zustand'
import type { Customer } from '@/lib/db/schema'

export type OptimisticItem = {
  tempId: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  createdAt: string
  status: 'pending' | 'failed'
}

type CustomersStore = {
  optimistic: OptimisticItem[]
  canonical: Customer[]
  addOptimistic: (item: OptimisticItem) => void
  replaceOptimistic: (tempId: string, serverItem: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address' | 'createdAt'>) => void
  markFailed: (tempId: string) => void
  removeOptimistic: (tempId: string) => void
  setCanonical: (items: Customer[]) => void
}

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('customers')
  : null

export const useCustomersStore = create<CustomersStore>((set) => ({
  optimistic: [],
  canonical: [],
  addOptimistic: (item) => set((s) => ({
    optimistic: [item, ...s.optimistic.filter((x) => {
      if (x.tempId === item.tempId) return false
      const samePhone = item.phone && x.phone && item.phone.replace(/\D/g, '') === x.phone.replace(/\D/g, '')
      const sameEmail = item.email && x.email && item.email.trim().toLowerCase() === x.email.trim().toLowerCase()
      return !samePhone && !sameEmail
    })],
  })),
  replaceOptimistic: (tempId, serverItem) => set((s) => ({
    optimistic: s.optimistic.filter((item) => item.tempId !== tempId),
    canonical: [serverItem as Customer, ...s.canonical.filter((item) => item.id !== serverItem.id)],
  })),
  markFailed: (tempId) => set((s) => ({ optimistic: s.optimistic.map((item) => item.tempId === tempId ? { ...item, status: 'failed' } : item) })),
  removeOptimistic: (tempId) => set((s) => ({ optimistic: s.optimistic.filter((item) => item.tempId !== tempId) })),
  setCanonical: (items) => set({ canonical: items }),
}))

if (channel) {
  channel.onmessage = (event: MessageEvent<{ type: string; customer?: Customer }>) => {
    if (event.data.type === 'customer-created' && event.data.customer) {
      useCustomersStore.getState().replaceOptimistic('', event.data.customer)
    }
  }
}

export function broadcastCustomerCreated(customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address' | 'createdAt'>) {
  channel?.postMessage({ type: 'customer-created', customer })
}
