'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { settlePharmacySupplierReturn, updatePharmacyReturnDisposition } from '@/app/actions/pharmacy'

export function ReturnDispositionActions({ dispositionId, canRelease }: { dispositionId: string; canRelease: boolean }) {
  const [decision, setDecision] = useState<'released' | 'supplier_return' | 'disposed' | null>(null)
  const [pending, startTransition] = useTransition()
  if (!decision) return <div className="flex justify-end gap-1.5">{canRelease && <button onClick={() => setDecision('released')} className="rounded-md border px-2 py-1 text-[10px] font-semibold hover:bg-muted">Release</button>}<button onClick={() => setDecision('supplier_return')} className="rounded-md border px-2 py-1 text-[10px] font-semibold hover:bg-muted">Supplier return</button><button onClick={() => setDecision('disposed')} className="rounded-md border border-red-300 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50">Dispose</button></div>
  return <form className="grid min-w-64 gap-2 text-left" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { await updatePharmacyReturnDisposition({ dispositionId, decision, reason: String(form.get('reason')), supplierReference: String(form.get('supplierReference') || '') || undefined }); toast.success('Return decision recorded'); setDecision(null) } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save decision') } }) }}>
    {decision === 'supplier_return' && <input name="supplierReference" required minLength={2} maxLength={120} placeholder="Supplier RMA/return reference" className="h-8 rounded-md border bg-background px-2 text-xs" />}
    <input name="reason" required minLength={3} maxLength={300} placeholder="Inspection and decision reason" className="h-8 rounded-md border bg-background px-2 text-xs" />
    <div className="flex justify-end gap-1"><button type="button" onClick={() => setDecision(null)} className="rounded-md border px-2 py-1 text-[10px]">Cancel</button><button disabled={pending} className="rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold text-background">{pending ? 'Saving…' : 'Confirm'}</button></div>
  </form>
}

export function SupplierReturnSettlement({ dispositionId }: { dispositionId: string }) {
  const [pending, startTransition] = useTransition()
  return <form className="flex flex-wrap justify-end gap-1.5" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { await settlePharmacySupplierReturn({ dispositionId, status: String(form.get('status')) as 'accepted' | 'credited' | 'rejected', creditNote: String(form.get('creditNote') || '') || undefined, notes: String(form.get('notes')) }); toast.success('Supplier return updated') } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update supplier return') } }) }}>
    <select name="status" className="h-8 rounded-md border bg-background px-2 text-[10px]"><option value="accepted">Accepted</option><option value="credited">Credited</option><option value="rejected">Rejected</option></select>
    <input name="creditNote" maxLength={120} placeholder="Credit note if credited" className="h-8 w-36 rounded-md border bg-background px-2 text-[10px]" />
    <input name="notes" required minLength={3} maxLength={300} placeholder="Supplier response/evidence" className="h-8 w-40 rounded-md border bg-background px-2 text-[10px]" />
    <button disabled={pending} className="h-8 rounded-md bg-foreground px-2 text-[10px] font-semibold text-background">{pending ? 'Saving…' : 'Save'}</button>
  </form>
}
