'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, Circle, RotateCcw, X } from 'lucide-react'
import type { SetupChecklistItem } from '@/lib/services/setup-checklist-service'

export function SetupChecklist({ items, initiallyDismissed }: { items: SetupChecklistItem[]; initiallyDismissed: boolean }) {
  const [dismissed, setDismissed] = useState(initiallyDismissed)
  const [expanded, setExpanded] = useState(false)
  const completed = items.filter((item) => item.completed).length
  const remainingItems = items.filter((item) => !item.completed)
  const nextItem = items.find((item) => !item.completed)
  const progress = items.length ? Math.round((completed / items.length) * 100) : 100

  const setVisibility = async (nextDismissed: boolean) => {
    setDismissed(nextDismissed)
    const response = await fetch('/api/onboarding/checklist', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dismissed: nextDismissed }),
    })
    if (!response.ok) setDismissed(!nextDismissed)
  }

  if (dismissed) {
    return <div className="mx-auto mb-4 flex w-full max-w-[1480px] justify-end"><button type="button" onClick={() => setVisibility(false)} className="inline-flex min-h-8 items-center gap-2 rounded-md border border-[#dfe3ea] bg-white px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"><RotateCcw className="h-3.5 w-3.5" /> Resume setup <span className="text-[#98a2b3]">{completed}/{items.length}</span></button></div>
  }

  return (
    <section className="mx-auto mb-5 w-full max-w-[1480px] overflow-hidden rounded-lg border border-[#eadfbd] bg-[#fffdf7] shadow-[0_1px_3px_rgba(16,24,40,.04)]" aria-labelledby="setup-checklist-title">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#ffda32] text-sm font-bold tabular-nums text-[#101828]">{progress}%</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 id="setup-checklist-title" className="text-sm font-bold text-[#101828] sm:text-base">{completed === items.length ? 'Workspace ready' : 'Finish your workspace setup'}</h2><span className="text-xs text-[#667085]">{completed}/{items.length} complete</span></div>
            <p className="mt-1 truncate text-xs text-[#667085]">{nextItem ? <>Next: {nextItem.title}</> : 'Your essential workspace setup is complete.'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {nextItem && <Link href={nextItem.href} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-[#e42527] px-3 text-xs font-semibold text-white transition hover:bg-[#c91f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2">Continue setup <ArrowRight className="h-3.5 w-3.5" /></Link>}
          <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#dfe3ea] px-3 text-xs font-semibold text-[#344054] transition hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]">{expanded ? 'Hide tasks' : 'All tasks'}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>
          <button type="button" onClick={() => setVisibility(true)} aria-label="Dismiss setup checklist" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#98a2b3] transition hover:bg-[#f4f5f7] hover:text-[#344054] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="h-0.5 bg-[#f4f5f7]"><div className="h-full bg-[#d9a900] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>

      {expanded && <div className="border-t border-[#edf0f4] bg-[#fafbfc] p-3 sm:p-4"><div className="mb-2 flex items-center justify-between"><div><h3 className="text-xs font-bold uppercase tracking-wide text-[#667085]">Remaining tasks</h3><p className="mt-0.5 text-xs text-[#98a2b3]">Only unfinished setup steps are shown here.</p></div><span className="text-xs text-[#98a2b3]">{remainingItems.length} remaining</span></div>{remainingItems.length > 0 ? <div className="grid gap-px overflow-hidden rounded-md border border-[#e6e9ee] bg-[#e6e9ee] sm:grid-cols-2 xl:grid-cols-4">{remainingItems.map((item) => <Link key={item.id} href={item.href} className="group flex min-h-[68px] items-start gap-3 bg-white px-3 py-3 transition hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e42527]"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#cbd2dc] text-[#a0a8b7]"><Circle className="h-2.5 w-2.5" /></span><span className="min-w-0"><span className="block text-xs font-semibold text-[#101828]">{item.title}</span><span className="mt-0.5 block line-clamp-1 text-[11px] leading-4 text-[#8a94a5]">{item.description}</span></span></Link>)}</div> : <div className="rounded-md border border-[#d9eadc] bg-[#f5fbf6] px-3 py-3 text-sm text-[#28743c]">All setup tasks are complete.</div>}</div>}
    </section>
  )
}
