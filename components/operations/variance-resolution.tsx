'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { resolveShiftVariance } from '@/app/actions/operations'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'

export function VarianceResolution({ sessionId, sessionNo }: { sessionId: string; sessionNo: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()
  const submit = () => startTransition(async () => {
    try {
      await resolveShiftVariance({ sessionId, note })
      notify.success('Cash variance marked as reviewed')
      setOpen(false)
      setNote('')
      router.refresh()
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to resolve cash variance')
    }
  })

  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="ml-auto shrink-0 gap-1.5">
      <CheckCircle2 className="h-3.5 w-3.5" />Review & resolve
    </Button>
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve cash variance</DialogTitle>
          <DialogDescription>Record the outcome for {sessionNo}. The shift amount and original reconciliation remain unchanged for audit purposes.</DialogDescription>
        </DialogHeader>
        <label className="grid gap-1.5 text-sm font-medium">Resolution note
          <Input value={note} maxLength={500} autoFocus onChange={(event) => setNote(event.target.value)} placeholder="Explain how the variance was reviewed or resolved" />
        </label>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={pending || note.trim().length < 3} onClick={submit}>{pending ? 'Saving…' : 'Mark resolved'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
