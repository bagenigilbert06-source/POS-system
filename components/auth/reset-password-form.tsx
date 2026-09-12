'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function safeInternalPath(value: string | undefined) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : undefined
}

export function ResetPasswordForm({ token, returnTo }: { token?: string; returnTo?: string }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState(token ? '' : 'This password-reset link is invalid or has expired.')
  const safeReturnTo = safeInternalPath(returnTo)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    if (password.length < 8) return setError('Use at least 8 characters for your new password.')
    if (password !== confirmPassword) return setError('The passwords do not match.')
    setPending(true)
    setError('')
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) throw new Error(result.error.message)
      setComplete(true)
    } catch {
      setError('This password-reset link is invalid or has expired. Request a new link and try again.')
    } finally {
      setPending(false)
    }
  }

  if (complete) {
    const destination = safeReturnTo || '/sign-in'
    return (
      <div className="py-2 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.025em] text-slate-950">Password updated</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Your password has been changed securely. You can now sign in.</p>
        <Button asChild className="mt-6 h-11 w-full bg-[#e42527] text-white hover:bg-[#c91f21]">
          <Link href={destination}>{safeReturnTo ? 'Return to invitation' : 'Sign in to Pesaby'}</Link>
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block text-sm font-semibold text-slate-800" htmlFor="new-password">
        New password
        <div className="relative mt-2">
          <KeyRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <Input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="h-11 border-slate-300 bg-white pl-10 pr-11 shadow-sm focus-visible:ring-[#ffbf00]" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <button type="button" className="absolute right-3 top-3 text-slate-400 hover:text-slate-700" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
      </label>
      <label className="block text-sm font-semibold text-slate-800" htmlFor="confirm-password">
        Confirm new password
        <Input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className="mt-2 h-11 border-slate-300 bg-white shadow-sm focus-visible:ring-[#ffbf00]" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p>}
      <Button className="h-11 w-full bg-[#e42527] text-white shadow-sm hover:bg-[#c91f21]" loading={pending} loadingLabel="Updating password" disabled={pending || !token}>Update password</Button>
      <p className="text-center text-xs leading-5 text-slate-500">Use at least 8 characters. This reset link can only be used once.</p>
    </form>
  )
}
