'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Delete, LockKeyhole, UserRound } from 'lucide-react'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'
import { getLockedPosStaff, getPosTerminalStaff, unlockCurrentLockedPos, unlockPosWithStaffPin } from '@/app/actions/pos-pin'

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'] as const
type Staff = { id: string; name: string; role: string; pinSet: boolean }

export function PosPinLoginForm() {
  const router = useRouter()
  const [staff, setStaff] = useState<Staff[]>([])
  const [lockedStaffName, setLockedStaffName] = useState<string | null>(null)
  const [switchingCashier, setSwitchingCashier] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [pin, setPin] = useState('')
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()

  useEffect(() => {
    let active = true
    void getLockedPosStaff().then((result) => {
      if (!active) return
      if (result.error) setError(result.error)
      setLoadingStaff(false)
      setLockedStaffName(result.staff?.name ?? null)
    })
    return () => { active = false }
  }, [])

  const loadSwitchableStaff = () => {
    setSwitchingCashier(true)
    setLoadingStaff(true)
    void getPosTerminalStaff().then((result) => {
      setStaff(result.staff)
      if (result.staff.length === 1) setSelectedStaffId(result.staff[0].id)
      if (result.error) setError(result.error)
      setLoadingStaff(false)
    })
  }

  const submit = () => {
    if (!selectedStaffId || pin.length !== 6 || pending) return
    start(async () => {
      setError('')
      const result = lockedStaffName && !switchingCashier
        ? await unlockCurrentLockedPos(pin)
        : await unlockPosWithStaffPin(selectedStaffId, pin)
      if (!result.success) {
        setPin('')
        setError(result.error ?? 'Unable to unlock this POS terminal. Please try again.')
        return
      }
      router.replace('/dashboard/pos')
      router.refresh()
    })
  }
  const press = (key: typeof keys[number]) => {
    if (key === 'clear') return setPin('')
    if (key === 'delete') return setPin((value) => value.slice(0, -1))
    setPin((value) => value.length < 6 ? `${value}${key}` : value)
  }
  const selectedStaff = staff.find((member) => member.id === selectedStaffId)
  const canSubmit = Boolean((lockedStaffName && !switchingCashier) || (selectedStaffId && selectedStaff?.pinSet)) && pin.length === 6

  return <div className="w-full space-y-5">
    {lockedStaffName && !switchingCashier ? (
      <div className="rounded-lg border border-[#f3d77a] bg-[#fff9df] px-4 py-3"><p className="text-xs font-bold uppercase tracking-wide text-[#7a5700]">Unlocking as</p><p className="mt-1 text-sm font-extrabold text-slate-950">{lockedStaffName}</p></div>
    ) : <div>
      <label htmlFor="pos-staff" className="mb-2 block text-sm font-semibold text-zinc-800">Staff member</label>
      {loadingStaff ? (
        <div className="flex h-12 items-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 text-sm text-zinc-500"><Loader2 className="h-4 w-4" label="Loading staff" />Loading staff for this terminal…</div>
      ) : (
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <select id="pos-staff" value={selectedStaffId} onChange={(event) => { setSelectedStaffId(event.target.value); setPin(''); setError('') }} disabled={pending || staff.length === 0} className="h-12 w-full appearance-none rounded-lg border border-zinc-300 bg-white pl-10 pr-4 text-sm font-semibold text-zinc-900 outline-none transition-colors focus:border-[#d4aa00] focus:ring-2 focus:ring-[#ffda32]/30 disabled:cursor-not-allowed disabled:bg-zinc-100">
            <option value="">Select staff member</option>
            {staff.map((member) => <option key={member.id} value={member.id}>{member.name}{member.pinSet ? '' : ' (PIN not set)'}</option>)}
          </select>
        </div>
      )}
      {!loadingStaff && staff.length === 0 && !error && <p className="mt-2 text-xs text-zinc-500">No eligible staff are assigned to this terminal.</p>}
    </div>}
    <div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold text-zinc-800">POS PIN</label><span className="text-xs font-medium text-zinc-500">{pin.length}/6</span></div><div className="flex h-14 items-center justify-center rounded-lg border border-zinc-300 bg-white text-xl tracking-[0.55em] text-zinc-900" aria-label={`${pin.length} of 6 PIN digits entered`}>{pin ? '●'.repeat(pin.length) : <span className="tracking-normal text-sm text-zinc-400">Enter your six-digit PIN</span>}</div></div>
    <div className="grid grid-cols-3 gap-2" aria-label="PIN keypad">{keys.map((key) => <button key={key} type="button" disabled={pending || loadingStaff || (!lockedStaffName && !selectedStaffId)} onClick={() => press(key)} className="flex h-12 items-center justify-center rounded-lg border border-zinc-200 bg-white text-base font-bold text-zinc-800 transition-colors duration-100 hover:border-[#d4aa00] hover:bg-[#fff9df] disabled:cursor-not-allowed disabled:opacity-50">{key === 'clear' ? <span className="text-xs">Clear</span> : key === 'delete' ? <Delete className="h-4 w-4" /> : key}</button>)}</div>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-center text-sm font-medium text-red-700" role="alert">{error}</p>}
    <button type="button" onClick={submit} disabled={!canSubmit || pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ffda32] text-sm font-extrabold text-slate-950 shadow-sm transition-colors duration-100 hover:bg-[#e8c42d] disabled:cursor-not-allowed disabled:opacity-50">{pending ? <><Loader2 className="h-4 w-4" />Checking PIN…</> : <><LockKeyhole className="h-4 w-4" />Unlock POS</>}</button>
    {lockedStaffName && !switchingCashier ? <button type="button" onClick={loadSwitchableStaff} className="mx-auto block text-xs font-bold text-[#a56b00] underline-offset-4 hover:underline">Sign in as another staff member</button> : <p className="text-center text-xs leading-5 text-zinc-500">Choose your staff profile, then use your six-digit POS PIN.</p>}
  </div>
}
