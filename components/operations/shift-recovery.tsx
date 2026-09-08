'use client'

import { useState, useTransition } from 'react'
import {
  beginPosSessionClose,
  completePosSessionClose,
  getPosSessionReconciliation,
  submitPosSessionCount,
  takeOverPosSessionReconciliation,
} from '@/app/actions/operations'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { useRouter } from 'next/navigation'

type Reconciliation = { expectedCash: number; countedCash: number; variance: number; requiresReason: boolean; tolerance: number }

const reasons = [
  ['cashier_unavailable', 'Cashier unavailable'],
  ['terminal_failure', 'Terminal failure'],
  ['shift_left_open', 'Shift left open'],
  ['emergency_closure', 'Emergency closure'],
  ['other', 'Other'],
] as const

export function ShiftRecovery({
  sessionId,
  cashierName,
  terminalName,
  status,
}: { sessionId: string; cashierName: string; terminalName: string; status: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'reason' | 'count' | 'confirm'>('reason')
  const [reason, setReason] = useState<(typeof reasons)[number][0]>('cashier_unavailable')
  const [note, setNote] = useState('')
  const [count, setCount] = useState('')
  const [varianceReason, setVarianceReason] = useState('')
  const [summary, setSummary] = useState<Reconciliation | null>(null)
  const [pending, startTransition] = useTransition()

  const fail = (error: unknown) => notify.error(error instanceof Error ? error.message : 'Unable to recover this shift')
  const start = () => startTransition(async () => {
    try {
      if (reason === 'other' && !note.trim()) throw new Error('Enter a recovery note when selecting Other')
      if (status === 'closing') {
        const takeover = await takeOverPosSessionReconciliation({ sessionId, reason, note: note.trim() || undefined })
        if (takeover.countedCash != null) {
          setSummary(await getPosSessionReconciliation(sessionId))
          setStep('confirm')
        } else setStep('count')
      } else {
        await beginPosSessionClose({ sessionId, reason, note: note.trim() || undefined })
        setStep('count')
      }
      notify.success(status === 'closing' ? 'Manager reconciliation takeover recorded' : 'Manager reconciliation started', { description: 'Count the drawer before expected cash is shown.' })
      router.refresh()
    } catch (error) { fail(error) }
  })
  const submitCount = () => startTransition(async () => {
    try {
      const amount = Number(count)
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Enter the physical drawer cash amount')
      await submitPosSessionCount({ sessionId, countedCash: amount })
      setSummary(await getPosSessionReconciliation(sessionId))
      setStep('confirm')
    } catch (error) { fail(error) }
  })
  const close = () => startTransition(async () => {
    try {
      if (!summary) return
      if (summary.requiresReason && !varianceReason.trim()) throw new Error('Enter a reason for the cash variance')
      await completePosSessionClose({ sessionId, countedCash: summary.countedCash, reason: varianceReason.trim() || undefined, notes: note.trim() || undefined })
      notify.success('Shift reconciled and terminal released')
      setOpen(false); setStep('reason'); setSummary(null); setCount(''); setVarianceReason('')
      router.refresh()
    } catch (error) { fail(error) }
  })
  const recount = () => {
    // Keep the reconciliation open but discard the review state. Submitting the
    // next blind count replaces the draft count on the server before close.
    setStep('count')
    setSummary(null)
    setCount('')
    setVarianceReason('')
  }

  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{status === 'closing' ? 'Take over reconciliation' : 'Recover shift'}</Button>
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manager shift recovery</DialogTitle>
          <DialogDescription>{cashierName}&apos;s open shift on {terminalName}. This follows the normal blind cash reconciliation and does not alter sales.</DialogDescription>
        </DialogHeader>
        {step === 'reason' && <div className="space-y-4">
          <label className="grid gap-1.5 text-sm font-medium">Recovery reason
            <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} className="h-10 rounded-md border bg-background px-3 text-sm">
              {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Recovery notes {reason === 'other' ? '(required)' : '(optional)'}
            <Input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Record the handover or incident details" />
          </label>
        </div>}
        {step === 'count' && <div className="space-y-3">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">Count physical drawer cash first. Expected cash remains hidden until you submit the count.</p>
          <label className="grid gap-1.5 text-sm font-medium">Physical drawer cash
            <Input inputMode="decimal" value={count} onChange={(event) => setCount(event.target.value)} placeholder="0.00" autoFocus />
          </label>
        </div>}
        {step === 'confirm' && summary && <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-center text-sm"><div><p className="text-xs text-muted-foreground">Expected</p><strong>KES {summary.expectedCash.toLocaleString()}</strong></div><div><p className="text-xs text-muted-foreground">Counted</p><strong>KES {summary.countedCash.toLocaleString()}</strong></div><div><p className="text-xs text-muted-foreground">Variance</p><strong>KES {summary.variance.toLocaleString()}</strong></div></div>
          <label className="grid gap-1.5 text-sm font-medium">Variance reason {summary.requiresReason ? '(required)' : '(optional)'}
            <Input value={varianceReason} maxLength={300} onChange={(event) => setVarianceReason(event.target.value)} placeholder="Explain any cash difference" />
          </label>
        </div>}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
          {step === 'reason' && <Button disabled={pending} onClick={start}>Start reconciliation</Button>}
          {step === 'count' && <Button disabled={pending} onClick={submitCount}>Submit blind count</Button>}
          {step === 'confirm' && <>
            <Button variant="outline" disabled={pending} onClick={recount}>Recount cash</Button>
            <Button disabled={pending} onClick={close}>Close reconciled shift</Button>
          </>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
