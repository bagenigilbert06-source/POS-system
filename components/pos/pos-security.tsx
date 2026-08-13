'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { getOwnPosPinStatus, lockPos, registerCurrentPosTerminal, setOwnPosPin } from '@/app/actions/pos-pin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function PosSecurity({ branchId, initialPinSet = false }: { branchId: string; initialPinSet?: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [setup, setSetup] = useState(false)
  const [pinSet, setPinSet] = useState(initialPinSet)
  const [error, setError] = useState('')

  useEffect(() => { start(async () => { await registerCurrentPosTerminal(branchId); if (!initialPinSet) { const status = await getOwnPosPinStatus(); setPinSet(status.isSet) } }) }, [branchId, initialPinSet])
  const run = (task: () => Promise<void>) => start(async () => { try { setError(''); await task() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to continue') } })
  const lock = () => run(async () => { await lockPos(); router.replace('/sign-in?pos=1') })
  const savePin = () => run(async () => { if (pin !== confirm) throw new Error('PINs do not match'); await setOwnPosPin(pin); setPinSet(true); setSetup(false); setPin(''); setConfirm('') })

  return <>
    <div className="flex flex-wrap items-center justify-end gap-2"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />POS PIN {pinSet ? 'set' : 'not set'}</span>{!pinSet && <Button size="sm" variant="outline" onClick={() => setSetup(true)}>Create POS PIN</Button>}<Button size="sm" onClick={lock} disabled={!pinSet || pending}><LockKeyhole className="mr-2 h-4 w-4" />Lock POS</Button></div>
    {setup && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4"><div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl"><h2 className="text-xl font-bold">Create your POS PIN</h2><p className="mt-1 text-sm text-muted-foreground">Use six private digits. This PIN unlocks only authorised POS terminals.</p><div className="mt-5 space-y-3"><Input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} placeholder="6-digit PIN" className="text-center text-2xl tracking-[.4em]" /><Input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={confirm} onChange={event => setConfirm(event.target.value.replace(/\D/g, ''))} placeholder="Confirm PIN" className="text-center text-2xl tracking-[.4em]" />{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex gap-2"><Button variant="outline" onClick={() => setSetup(false)}>Cancel</Button><Button onClick={savePin} disabled={pending || pin.length !== 6 || confirm.length !== 6}>Save PIN</Button></div></div></div></div>}
  </>
}
