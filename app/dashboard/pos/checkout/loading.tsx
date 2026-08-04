import { Loader2, CreditCard } from 'lucide-react'

export default function CheckoutLoading() {
  return <div className="mx-auto flex min-h-[62vh] max-w-[1480px] items-center justify-center"><div className="w-full max-w-md rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-8 text-center shadow-[0_16px_40px_rgba(0,0,0,.16)]"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(255,214,10,.12)] text-[#ffd60a]"><CreditCard className="h-6 w-6" /></span><Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-[#ffd60a]" /><h1 className="mt-3 text-lg font-bold text-[var(--dashboard-text)]">Preparing checkout</h1><p className="mt-1 text-sm text-[var(--dashboard-muted)]">Loading your basket and payment options…</p></div></div>
}
