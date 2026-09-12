'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { acceptStaffInvitationAction, resendStaffVerificationAction } from '@/app/actions/staff-invitation-actions'
import { authClient } from '@/lib/auth-client'

export function SetupAccountForm({ token, existingAccount, signedInForInvitation, awaitingVerification, invalid, email, businessName }: { token?: string; existingAccount?: boolean; signedInForInvitation?: boolean; awaitingVerification?: boolean; invalid?: boolean; email?: string; businessName?: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [completed, setCompleted] = useState(false)

  if (invalid || !token) return null

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!existingAccount && password !== confirm) return setMessage('Passwords do not match.')
    setPending(true)
    setMessage('')
    try {
      if (existingAccount && !signedInForInvitation) {
        const result = await authClient.signIn.email({ email: email || '', password, rememberMe: true })
        if (result.error) throw new Error('The email or password you entered is incorrect.')
      }
      const result = await acceptStaffInvitationAction(token, existingAccount ? undefined : password)
      if ('awaitingEmailVerification' in result) router.refresh()
      else setCompleted(true)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not complete this invitation. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const resend = async () => {
    setPending(true)
    setMessage('')
    try {
      await resendStaffVerificationAction(token)
      setMessage('A new verification email has been sent.')
      setCooldown(30)
      const id = window.setInterval(() => setCooldown((value) => { if (value <= 1) { window.clearInterval(id); return 0 } return value - 1 }), 1000)
    } catch { setMessage('Unable to resend the verification email.') } finally { setPending(false) }
  }

  if (completed) return <div className="space-y-5 py-4 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" aria-hidden="true"/><div><p className="text-sm font-semibold text-emerald-700">You&apos;re all set</p><h2 className="mt-1 text-xl font-semibold">Taking you to your workspace…</h2></div><Button asChild className="w-full"><Link href="/auth/continue">Open Pesaby</Link></Button></div>
  if (awaitingVerification) return <div className="space-y-5 py-2 text-center"><MailCheck className="mx-auto h-9 w-9 text-amber-500" aria-hidden="true"/><div><h2 className="text-xl font-semibold">Check your email</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">We sent a verification link to {email}. Verify your email to finish activating your account.</p></div><Button type="button" variant="outline" className="w-full" disabled={pending || cooldown > 0} onClick={resend}>{pending ? 'Sending…' : cooldown ? `Resend in ${cooldown}s` : 'Resend verification email'}</Button>{message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}</div>

  if (existingAccount) return <form onSubmit={submit} className="space-y-5">
    <div><h2 className="text-xl font-semibold tracking-tight">Welcome back</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">Sign in to accept your invitation to {businessName}.</p></div>
    <div><label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="invite-email">Email</label><Input id="invite-email" value={email || ''} readOnly className="bg-slate-50 text-slate-600" /></div>
    <div><label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="invite-password">Password</label><div className="relative"><Input id="invite-password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required className="pr-11"/><button className="absolute right-3 top-2.5 text-slate-500" type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div>
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}<Button className="h-11 w-full" disabled={pending}>{pending ? 'Signing in…' : 'Sign in & accept invitation'}</Button><Link className="block text-center text-sm font-medium text-primary underline underline-offset-4" href={`/forgot-password?callbackURL=${encodeURIComponent(`/setup-account?token=${token}`)}`}>Forgot password?</Link>
  </form>

  return <form onSubmit={submit} className="space-y-5"><div><h2 className="text-xl font-semibold tracking-tight">Create your account</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">Set a password to finish joining Pesaby.</p></div><div><label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="invite-email">Email</label><Input id="invite-email" value={email || ''} readOnly className="bg-slate-50 text-slate-600" /></div><PasswordField id="invite-password" label="Password" value={password} onChange={setPassword} show={show} setShow={setShow} autoComplete="new-password"/><PasswordField id="invite-confirm" label="Confirm password" value={confirm} onChange={setConfirm} show={show} setShow={setShow} autoComplete="new-password"/>{message && <p role="alert" className="text-sm text-destructive">{message}</p>}<Button className="h-11 w-full" disabled={pending}>{pending ? 'Creating account…' : 'Accept invitation & continue'}</Button></form>
}

function PasswordField({ id, label, value, onChange, show, setShow, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; show: boolean; setShow: (value: boolean) => void; autoComplete: string }) {
  return <div><label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor={id}>{label}</label><div className="relative"><Input id={id} type={show ? 'text' : 'password'} minLength={8} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} required className="pr-11"/><button className="absolute right-3 top-2.5 text-slate-500" type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div>
}
