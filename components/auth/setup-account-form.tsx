'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, MailCheck, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { acceptStaffInvitationAction, resendStaffVerificationAction } from '@/app/actions/staff-invitation-actions'

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
    if (password !== confirm) return setMessage('Passwords do not match.')
    setPending(true)
    setMessage('')
    try {
      const result = await acceptStaffInvitationAction(token, existingAccount ? undefined : password)
      if ('awaitingEmailVerification' in result) router.refresh()
      else setCompleted(true)
    } catch {
      setMessage(existingAccount
        ? 'This invitation belongs to another account. Sign out and continue using the invited email address.'
        : 'We could not create your account. Please try again.')
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
      const id = window.setInterval(() => setCooldown((value) => {
        if (value <= 1) {
          window.clearInterval(id)
          return 0
        }
        return value - 1
      }), 1000)
    } catch {
      setMessage('Unable to resend the verification email.')
    } finally {
      setPending(false)
    }
  }

  if (completed) return <div className="space-y-5 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true"/><div><p className="text-sm font-semibold text-emerald-700">Invitation accepted</p><h2 className="mt-1 text-xl font-bold">Your account is ready</h2><p className="mt-2 text-sm text-muted-foreground">You can now open your Pesaby workspace.</p></div><Button asChild className="w-full"><Link href="/auth/continue">Continue to Pesaby</Link></Button></div>

  if (awaitingVerification) return <div className="space-y-5 text-center"><MailCheck className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true"/><div><h2 className="text-xl font-bold">Check your email</h2><p className="mt-2 text-sm text-muted-foreground">We sent a verification link to {email}. Verify your email to finish activating your employee account.</p></div><Button type="button" variant="outline" className="w-full" disabled={pending || cooldown > 0} onClick={resend}>{pending ? 'Sending…' : cooldown ? `Resend in ${cooldown}s` : 'Resend verification email'}</Button><Link className="block text-sm underline" href="/sign-in">Back to sign in</Link><p className="text-xs text-muted-foreground">Didn’t receive it? Check your spam or junk folder.</p>{message && <p role="status" className="text-sm">{message}</p>}</div>

  if (existingAccount) return <div className="space-y-6"><div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><ShieldCheck className="h-5 w-5" aria-hidden="true"/></span><div><h2 className="font-bold text-slate-950">An account already exists</h2><p className="mt-1 text-sm leading-5 text-slate-600">This work email is already registered with Pesaby. Sign in to safely confirm and accept this invitation.</p></div></div></div>{email && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Sign in with</span><span className="mt-1 block break-all font-medium text-slate-900">{email}</span></div>}{signedInForInvitation ? <form onSubmit={submit} className="space-y-3"><Button className="h-11 w-full bg-[#e42527] text-white hover:bg-[#c91f21]" disabled={pending}>{pending ? 'Accepting invitation…' : 'Accept invitation'}</Button><p className="text-center text-xs text-slate-500">You are signed in with the invited email.</p></form> : <div className="space-y-4"><ol className="space-y-2 text-sm text-slate-600"><li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">1</span>Sign in with the email above.</li><li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">2</span>Return here and accept the invitation.</li></ol><Button asChild className="h-11 w-full bg-[#e42527] text-white hover:bg-[#c91f21]"><Link href={`/sign-in?callbackURL=${encodeURIComponent(`/setup-account?token=${token}`)}`}>Sign in and accept invitation <ArrowRight className="ml-2 h-4 w-4"/></Link></Button><div className="rounded-xl border border-slate-200 p-4"><div className="flex gap-3"><KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" aria-hidden="true"/><div><p className="text-sm font-semibold text-slate-900">Forgot your password?</p><p className="mt-1 text-xs leading-5 text-slate-500">We’ll send a secure reset link and bring you back to this invitation.</p><Link className="mt-2 inline-flex text-sm font-semibold text-[#c91f21] underline-offset-4 hover:underline" href={`/forgot-password?callbackURL=${encodeURIComponent(`/setup-account?token=${token}`)}`}>Reset password <ArrowRight className="ml-1 h-3.5 w-3.5"/></Link></div></div></div></div>}</div>

  return <form onSubmit={submit} className="space-y-4"><div><h2 className="text-xl font-bold">Create your account</h2><p className="mt-1 text-sm text-muted-foreground">Choose a password you’ll use to sign in to Pesaby.</p></div>{email && <div className="rounded-lg border bg-muted/30 p-3 text-sm"><span className="block text-xs text-muted-foreground">Account email</span>{email}</div>}<label className="block text-sm font-medium" htmlFor="invite-password">Password<div className="relative mt-1"><Input id="invite-password" type={show ? 'text' : 'password'} minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required/><button className="absolute right-3 top-2.5" type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></label><label className="block text-sm font-medium" htmlFor="invite-confirm">Confirm password<Input id="invite-confirm" className="mt-1" type={show ? 'text' : 'password'} minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required/></label>{message && <p role="alert" className="text-sm text-destructive">{message}</p>}<Button className="w-full" disabled={pending}>{pending ? 'Creating account…' : 'Create account'}</Button></form>
}
