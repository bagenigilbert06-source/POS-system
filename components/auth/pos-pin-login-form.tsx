'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Delete, Loader2, LockKeyhole } from 'lucide-react'
import { unlockPosWithPhonePin } from '@/app/actions/pos-pin'

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'] as const

export function PosPinLoginForm() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const submit = () => start(async () => { try { setError(''); await unlockPosWithPhonePin(phone, pin); router.replace('/dashboard/pos'); router.refresh() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Phone number or PIN is incorrect') } })
  const press = (key: typeof keys[number]) => { if (key === 'clear') return setPin(''); if (key === 'delete') return setPin((value) => value.slice(0, -1)); setPin((value) => value.length < 6 ? `${value}${key}` : value) }
  const canSubmit = phone.replace(/\D/g, '').length >= 7 && pin.length === 6

  return <div className="w-full space-y-5">
    <div><label htmlFor="cashier-phone" className="mb-2 block text-sm font-semibold text-zinc-800">Phone number</label><input id="cashier-phone" autoFocus inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && canSubmit) submit() }} placeholder="e.g. 0712 345 678" className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-900 outline-none transition-colors duration-100 placeholder:text-zinc-400 focus:border-[#d4aa00] focus:ring-2 focus:ring-[#ffda32]/30" /></div>
    <div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold text-zinc-800">POS PIN</label><span className="text-xs font-medium text-zinc-500">{pin.length}/6</span></div><div className="flex h-14 items-center justify-center rounded-lg border border-zinc-300 bg-white text-xl tracking-[0.55em] text-zinc-900" aria-label={`${pin.length} of 6 PIN digits entered`}>{pin ? '●'.repeat(pin.length) : <span className="tracking-normal text-sm text-zinc-400">Enter your six-digit PIN</span>}</div></div>
    <div className="grid grid-cols-3 gap-2" aria-label="PIN keypad">{keys.map((key) => <button key={key} type="button" disabled={pending} onClick={() => press(key)} className="flex h-12 items-center justify-center rounded-lg border border-zinc-200 bg-white text-base font-bold text-zinc-800 transition-colors duration-100 hover:border-[#d4aa00] hover:bg-[#fff9df] disabled:cursor-not-allowed disabled:opacity-50">{key === 'clear' ? <span className="text-xs">Clear</span> : key === 'delete' ? <Delete className="h-4 w-4" /> : key}</button>)}</div>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-center text-sm font-medium text-red-700" role="alert">{error}</p>}
    <button type="button" onClick={submit} disabled={!canSubmit || pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ffda32] text-sm font-extrabold text-slate-950 shadow-sm transition-colors duration-100 hover:bg-[#e8c42d] disabled:cursor-not-allowed disabled:opacity-50">{pending ? <><Loader2 className="h-4 w-4 animate-spin" />Checking PIN…</> : <><LockKeyhole className="h-4 w-4" />Unlock POS</>}</button>
    <p className="text-center text-xs leading-5 text-zinc-500">Use the keypad, your keyboard, or press Enter to continue.</p>
  </div>
}
