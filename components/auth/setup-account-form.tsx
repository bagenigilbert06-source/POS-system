'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { acceptStaffInvitationAction } from '@/app/actions/staff-invitation-actions'

export function SetupAccountForm({ token, existingAccount, invalid }: { token?: string; existingAccount?: boolean; invalid?: boolean }) {
  const router = useRouter(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  if (invalid || !token) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">This invitation is invalid or has expired. Ask your administrator to resend it.</div>
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== confirm) return setError('Passwords do not match')
    setPending(true)
    setError('')
    try {
      const result = await acceptStaffInvitationAction(token, existingAccount ? undefined : password)
      if ('awaitingEmailVerification' in result) router.replace('/sign-in?verifyEmail=1')
      else router.replace('/dashboard')
      return
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to activate account')
      setPending(false)
    }
  }
  return <form onSubmit={submit} className="space-y-4"><div><label className="mb-2 block text-sm font-semibold">Create password</label><Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div><div><label className="mb-2 block text-sm font-semibold">Confirm password</label><Input type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={pending}>{pending ? 'Activating…' : 'Activate account'}</Button></form>
}
