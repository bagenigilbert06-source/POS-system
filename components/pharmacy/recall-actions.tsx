'use client'

import { useState, useTransition } from 'react'
import { notify } from '@/lib/notify'
import { initiateMedicineRecall, resolveMedicineRecall } from '@/app/actions/pharmacy'

export function StartRecallForm({ lotId }: { lotId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  if (!open) return <button className="rounded-md border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted" onClick={() => setOpen(true)}>Recall batch</button>
  return <form className="grid min-w-64 gap-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { await initiateMedicineRecall({ lotId, reference: String(form.get('reference')), reason: String(form.get('reason')) }); notify.success('Batch recalled and blocked from sale'); setOpen(false) } catch (error) { notify.error(error instanceof Error ? error.message : 'Recall failed') } }) }}>
    <input name="reference" required minLength={2} maxLength={120} placeholder="Recall/reference number" className="h-9 rounded-md border bg-background px-3 text-xs" />
    <input name="reason" required minLength={5} maxLength={500} placeholder="Reason for recall" className="h-9 rounded-md border bg-background px-3 text-xs" />
    <div className="flex gap-2"><button disabled={pending} className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{pending ? 'Recalling…' : 'Confirm recall'}</button><button type="button" onClick={() => setOpen(false)} className="rounded-md border px-3 py-2 text-xs">Cancel</button></div>
  </form>
}

export function ResolveRecallForm({ recallId }: { recallId: string }) {
  const [pending, startTransition] = useTransition()
  return <form className="flex flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { await resolveMedicineRecall({ recallId, resolution: String(form.get('resolution')) as 'release' | 'dispose', notes: String(form.get('notes')) }); notify.success('Recall resolved') } catch (error) { notify.error(error instanceof Error ? error.message : 'Resolution failed') } }) }}>
    <select name="resolution" className="h-9 rounded-md border bg-background px-2 text-xs"><option value="release">Release after clearance</option><option value="dispose">Dispose stock</option></select>
    <input name="notes" required minLength={5} maxLength={500} placeholder="Resolution evidence/note" className="h-9 min-w-56 rounded-md border bg-background px-3 text-xs" />
    <button disabled={pending} className="h-9 rounded-md bg-foreground px-3 text-xs font-semibold text-background disabled:opacity-50">{pending ? 'Saving…' : 'Resolve'}</button>
  </form>
}
