'use client'

import { useState, useTransition } from 'react'
import { notify } from '@/lib/notify'
import { updatePharmacyBatchStatus } from '@/app/actions/pharmacy'

export function BatchStatusActions({ lotId, status, expired, quantity }: { lotId: string; status: string; expired: boolean; quantity: number }) {
  const [next, setNext] = useState<'available' | 'quarantined' | 'disposed' | null>(null)
  const [pending, startTransition] = useTransition()
  if (!next) return <div className="flex justify-end gap-1.5">{status === 'available' && quantity > 0 && <button onClick={() => setNext('quarantined')} className="rounded-md border px-2 py-1 text-[10px] font-semibold hover:bg-muted">Quarantine</button>}{status === 'quarantined' && !expired && <button onClick={() => setNext('available')} className="rounded-md border px-2 py-1 text-[10px] font-semibold hover:bg-muted">Release</button>}{['available','quarantined','recalled'].includes(status) && quantity > 0 && <button onClick={() => setNext('disposed')} className="rounded-md border border-red-300 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50">Dispose</button>}</div>
  return <form className="grid min-w-56 gap-1.5" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { await updatePharmacyBatchStatus({ lotId, status: next, reason: String(form.get('reason')) }); notify.success('Batch status updated'); setNext(null) } catch (error) { notify.error(error instanceof Error ? error.message : 'Batch update failed') } }) }}><input name="reason" required minLength={3} maxLength={300} autoFocus placeholder={`Reason to ${next === 'available' ? 'release' : next}`} className="h-8 rounded-md border bg-background px-2 text-xs" /><div className="flex justify-end gap-1"><button type="button" onClick={() => setNext(null)} className="rounded-md border px-2 py-1 text-[10px]">Cancel</button><button disabled={pending} className="rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold text-background">{pending ? 'Saving…' : 'Confirm'}</button></div></form>
}
