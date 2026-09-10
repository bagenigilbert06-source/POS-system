'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Clock3, LogIn, LogOut, ReceiptText, ShoppingCart } from 'lucide-react'
import { clockIn, clockOut } from '@/app/actions/attendance'
import { notify } from '@/lib/notify'

export function CashierHome({ name, branchName, activeClockIn }: { name: string; branchName: string; activeClockIn: string | null }) {
  const [working, setWorking] = useState(Boolean(activeClockIn))
  const [busy, setBusy] = useState(false)
  const [clockInAt, setClockInAt] = useState(activeClockIn)
  async function toggleAttendance() {
    setBusy(true)
    const result = working ? await clockOut() : await clockIn()
    if (result.ok) {
      const now = new Date().toISOString()
      setWorking(!working)
      setClockInAt(working ? null : now)
      notify.success(working ? 'You are clocked out for today' : 'You are clocked in and ready to work')
    } else notify.error(result.error)
    setBusy(false)
  }
  const time = clockInAt ? new Intl.DateTimeFormat('en-KE', { hour: 'numeric', minute: '2-digit' }).format(new Date(clockInAt)) : null
  return <main className="mx-auto max-w-6xl space-y-6 pb-10"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold text-[#c91f21]">CASHIER HOME</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Welcome back, {name.split(' ')[0]}</h1><p className="mt-2 text-sm text-slate-600">{branchName} · Start your shift, serve customers, and keep your register moving.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/dashboard/pos" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#e42527] px-5 text-sm font-bold text-white hover:bg-[#c91f21]"><ShoppingCart className="h-4 w-4" />Open POS</Link><button type="button" disabled={busy} onClick={toggleAttendance} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60">{working ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{busy ? 'Saving…' : working ? 'Clock out' : 'Clock in'}</button></div></section><section className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-5"><Clock3 className="h-5 w-5 text-[#c91f21]" /><p className="mt-4 text-sm font-medium text-slate-500">Attendance</p><p className="mt-1 text-xl font-bold text-slate-950">{working ? 'Clocked in' : 'Not clocked in'}</p><p className="mt-1 text-sm text-slate-500">{working && time ? `Since ${time}` : 'Clock in before your shift'}</p></div><Link href="/dashboard/pos" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#ffda32] hover:shadow-sm"><ShoppingCart className="h-5 w-5 text-[#c91f21]" /><p className="mt-4 text-sm font-medium text-slate-500">Point of sale</p><p className="mt-1 text-xl font-bold text-slate-950">Start a sale</p><p className="mt-1 text-sm text-slate-500">Checkout customers and manage your register.</p></Link><Link href="/dashboard/pos/history" className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-[#ffda32] hover:shadow-sm"><ReceiptText className="h-5 w-5 text-[#c91f21]" /><p className="mt-4 text-sm font-medium text-slate-500">Receipts</p><p className="mt-1 text-xl font-bold text-slate-950">Sale history</p><p className="mt-1 text-sm text-slate-500">Find and reprint recent receipts.</p></Link></section></main>
}
