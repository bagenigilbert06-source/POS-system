'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole, ShieldCheck, X } from 'lucide-react'
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
    <div className="flex flex-wrap items-center justify-end gap-2">{!pinSet && <Button size="sm" variant="outline" onClick={() => setSetup(true)}>Create POS PIN</Button>}<Button size="sm" variant="secondary" onClick={lock} disabled={!pinSet || pending}><LockKeyhole className="mr-2 h-4 w-4" />Lock POS</Button></div>
    {setup && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pos-pin-title"><div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,.45)]"><div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" /><div className="p-6 sm:p-7"><div className="mb-5 flex items-start justify-between"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600"><ShieldCheck className="h-5 w-5" /></div><div><h2 id="pos-pin-title" className="text-lg font-semibold tracking-tight text-slate-900">Create your POS PIN</h2><p className="mt-0.5 text-xs text-slate-500">Secure this terminal in seconds</p></div></div><button type="button" aria-label="Close" onClick={() => setSetup(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button></div><p className="text-sm leading-6 text-slate-600">Use six private digits. This PIN unlocks only authorised POS terminals.</p><div className="mt-5 space-y-3"><Input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} placeholder="6-digit PIN" className="h-12 rounded-xl border-slate-200 bg-slate-50 text-center text-xl tracking-[.35em] focus-visible:ring-amber-400/30" /><Input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={confirm} onChange={event => setConfirm(event.target.value.replace(/\D/g, ''))} placeholder="Confirm PIN" className="h-12 rounded-xl border-slate-200 bg-slate-50 text-center text-xl tracking-[.35em] focus-visible:ring-amber-400/30" />{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-5"><Button variant="outline" className="rounded-xl" onClick={() => setSetup(false)}>Cancel</Button><Button className="rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400" onClick={savePin} disabled={pending || pin.length !== 6 || confirm.length !== 6}>Save PIN</Button></div></div></div></div></div>}
  </>
}
