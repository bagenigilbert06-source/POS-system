'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, Circle, RotateCcw, X } from 'lucide-react'
import type { SetupChecklistItem } from '@/lib/services/setup-checklist-service'

export function SetupChecklist({ items, initiallyDismissed }: { items: SetupChecklistItem[]; initiallyDismissed: boolean }) {
  const [dismissed, setDismissed] = useState(initiallyDismissed)
  const completed = items.filter((item) => item.completed).length
  const setVisibility = async (nextDismissed: boolean) => {
    setDismissed(nextDismissed)
    const response = await fetch('/api/onboarding/checklist', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dismissed: nextDismissed }) })
    if (!response.ok) setDismissed(!nextDismissed)
  }

  if (dismissed) return <div className="mb-5 flex justify-end"><button type="button" onClick={() => setVisibility(false)} className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"><RotateCcw className="h-4 w-4" />Open setup checklist</button></div>

  return <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="setup-checklist-title">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#e42527]">Getting started</p><h2 id="setup-checklist-title" className="mt-1 text-lg font-extrabold text-slate-950">Finish setting up Pesaby</h2><p className="mt-1 text-sm text-zinc-600">{completed} of {items.length} tasks are complete based on your workspace records.</p></div><button type="button" onClick={() => setVisibility(true)} aria-label="Dismiss setup checklist" className="rounded-md p-2 text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"><X className="h-5 w-5" /></button></div>
    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <Link key={item.id} href={item.href} className="group flex items-center gap-3 rounded-lg border border-zinc-200 p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"><span className={item.completed ? 'text-emerald-700' : 'text-zinc-400'}>{item.completed ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950">{item.title}</span><span className="mt-0.5 block text-xs leading-5 text-zinc-500">{item.description}</span></span><ChevronRight className="h-4 w-4 text-zinc-400" /></Link>)}</div>
  </section>
}
