'use client'

import { useState } from 'react'
import { KeyRound, LockKeyhole } from 'lucide-react'
import { AuthForm } from '@/components/auth/auth-form'
import { PosPinLoginForm } from '@/components/auth/pos-pin-login-form'
import { cn } from '@/lib/utils'

export function PosAccessForm() {
  const [method, setMethod] = useState<'pin' | 'password'>('pin')

  return <div>
    <div className="mb-6 grid grid-cols-2 rounded-lg border border-zinc-200 bg-white p-1" role="tablist" aria-label="Sign-in method">
      <button type="button" role="tab" aria-selected={method === 'pin'} onClick={() => setMethod('pin')} className={cn('flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition-colors duration-100', method === 'pin' ? 'bg-[#ffda32] text-slate-950 shadow-sm' : 'text-zinc-600 hover:bg-zinc-50')}><KeyRound className="h-4 w-4" />POS PIN</button>
      <button type="button" role="tab" aria-selected={method === 'password'} onClick={() => setMethod('password')} className={cn('flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition-colors duration-100', method === 'password' ? 'bg-[#ffda32] text-slate-950 shadow-sm' : 'text-zinc-600 hover:bg-zinc-50')}><LockKeyhole className="h-4 w-4" />Password</button>
    </div>
    {method === 'pin' ? <><PosPinLoginForm /><p className="mt-5 text-center text-xs leading-5 text-zinc-500">PIN access unlocks this terminal for staff assigned to its branch.</p></> : <><p className="mb-5 text-center text-sm leading-6 text-zinc-600">Use your account password for full dashboard access, including manager and owner tools.</p><AuthForm mode="sign-in" /></>}
  </div>
}
