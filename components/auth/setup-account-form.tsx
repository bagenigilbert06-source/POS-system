'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function SetupAccountForm({ token, invalid }: { token?: string; invalid?: boolean }) {
  const router = useRouter(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  if (invalid || !token) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">This invitation is invalid or has expired. Ask your administrator to resend it.</div>
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (password !== confirm) return setError('Passwords do not match'); setPending(true); setError(''); const result = await authClient.resetPassword({ newPassword: password, token }); setPending(false); if (result.error) return setError(result.error.message || 'Unable to activate account'); router.push('/sign-in?activated=1') }
  return <form onSubmit={submit} className="space-y-4"><div><label className="mb-2 block text-sm font-semibold">Create password</label><Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div><div><label className="mb-2 block text-sm font-semibold">Confirm password</label><Input type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={pending}>{pending ? 'Activating…' : 'Activate account'}</Button></form>
}
