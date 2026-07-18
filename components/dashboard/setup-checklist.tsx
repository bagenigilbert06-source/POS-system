'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, ChevronRight, Circle, RotateCcw, X } from 'lucide-react'
import type { SetupChecklistItem } from '@/lib/services/setup-checklist-service'

export function SetupChecklist({ items, initiallyDismissed }: { items: SetupChecklistItem[]; initiallyDismissed: boolean }) {
  const [dismissed, setDismissed] = useState(initiallyDismissed)
  const [expanded, setExpanded] = useState(false)
  const completed = items.filter((item) => item.completed).length
  const nextItem = items.find((item) => !item.completed)
  const progress = items.length ? Math.round((completed / items.length) * 100) : 100

  const setVisibility = async (nextDismissed: boolean) => {
    setDismissed(nextDismissed)
    const response = await fetch('/api/onboarding/checklist', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dismissed: nextDismissed }) })
    if (!response.ok) setDismissed(!nextDismissed)
  }

  if (dismissed) return <div className="mx-auto mb-3 flex w-full max-w-[1440px] justify-end"><button type="button" onClick={() => setVisibility(false)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#dfe3ea] bg-white px-3 text-xs font-semibold text-[#344054] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"><RotateCcw className="h-3.5 w-3.5" />Show setup</button></div>

  return (
    <section className="mx-auto mb-4 w-full max-w-[1440px] overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]" aria-labelledby="setup-checklist-title">
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff6c8] text-xs font-bold tabular-nums text-[#101828]">{progress}%</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2"><h2 id="setup-checklist-title" className="text-sm font-bold text-[#101828]">{completed === items.length ? 'Workspace ready' : 'Finish your workspace setup'}</h2><span className="text-xs text-[#8a94a5]">{completed}/{items.length}</span></div>
            <p className="mt-0.5 truncate text-xs text-[#667085]">{nextItem ? `Next: ${nextItem.title}` : 'Your essential workspace setup is complete.'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
          {nextItem && <Link href={nextItem.href} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-[#e42527] px-3 text-xs font-semibold text-white hover:bg-[#c91f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#050a1f] focus-visible:ring-offset-2">Continue setup <ChevronRight className="h-3.5 w-3.5" /></Link>}
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#dfe3ea] px-3 text-xs font-semibold text-[#344054] hover:bg-[#f8f9fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]">{expanded ? 'Hide tasks' : 'All tasks'}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>
          <button type="button" onClick={() => setVisibility(true)} aria-label="Dismiss setup checklist" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#8a94a5] hover:bg-[#f4f5f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="h-0.5 bg-[#eef0f4]"><div className="h-full bg-[#ffda32] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
      {expanded && <div className="grid border-t border-[#edf0f4] sm:grid-cols-2 xl:grid-cols-4">{items.map((item) => <Link key={item.id} href={item.href} className="flex min-h-[76px] items-center gap-3 border-b border-r border-[#edf0f4] px-4 py-3 last:border-r-0 hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e42527]"><span className={item.completed ? 'text-[#e42527]' : 'text-[#a0a8b7]'}>{item.completed ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold text-[#101828]">{item.title}</span><span className="mt-0.5 line-clamp-1 block text-[0.7rem] text-[#8a94a5]">{item.description}</span></span></Link>)}</div>}
    </section>
  )
}
