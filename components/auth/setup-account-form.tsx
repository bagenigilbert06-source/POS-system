'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, LockKeyhole, MailCheck, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { acceptStaffInvitationAction, resendStaffVerificationAction } from '@/app/actions/staff-invitation-actions'
import { authClient } from '@/lib/auth-client'

type Props = { token?: string; existingAccount?: boolean; signedInForInvitation?: boolean; awaitingVerification?: boolean; invalid?: boolean; email?: string; businessName?: string }

export function SetupAccountForm({ token, existingAccount, signedInForInvitation, awaitingVerification, invalid, email, businessName }: Props) {
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
    if (!existingAccount && password.length < 8) return setMessage('Use at least 8 characters for your password.')
    if (!existingAccount && password !== confirm) return setMessage('Passwords do not match.')
    setPending(true); setMessage('')
    try {
      if (existingAccount && !signedInForInvitation) {
        const result = await authClient.signIn.email({ email: email || '', password, rememberMe: true })
        if (result.error) throw new Error('The email or password you entered is incorrect.')
      }
      const result = await acceptStaffInvitationAction(token, existingAccount ? undefined : password)
      if ('awaitingEmailVerification' in result) router.refresh(); else setCompleted(true)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'We could not complete this invitation. Please try again.') } finally { setPending(false) }
  }

  const resend = async () => {
    setPending(true); setMessage('')
    try {
      await resendStaffVerificationAction(token); setMessage('A new verification email has been sent.'); setCooldown(30)
      const id = window.setInterval(() => setCooldown((value) => { if (value <= 1) { window.clearInterval(id); return 0 }; return value - 1 }), 1000)
    } catch { setMessage('Unable to resend the verification email.') } finally { setPending(false) }
  }

  if (completed) return <StatusPanel icon={CheckCircle2} tone="success" title="You’re all set" description="Your account is ready. Continue to your workspace when you’re ready." action={<Button asChild className="h-11 w-full bg-slate-950 text-white hover:bg-slate-800"><Link href="/auth/continue">Open Pesaby</Link></Button>} />
  if (awaitingVerification) return <StatusPanel icon={MailCheck} tone="pending" title="Check your email" description={`We sent a verification link to ${email}. Open it to finish activating your account.`} action={<><Button type="button" variant="outline" className="h-11 w-full" disabled={pending || cooldown > 0} onClick={resend}>{pending ? 'Sending…' : cooldown ? `Resend in ${cooldown}s` : 'Resend verification email'}</Button>{message && <p role="status" className="text-center text-sm text-slate-600">{message}</p>}</>} />

  if (existingAccount) return <form onSubmit={submit} className="space-y-5" noValidate>
    <FormHeading title="Welcome back" description={`Sign in to securely accept your invitation to ${businessName}.`} />
    <div className="space-y-4 rounded-xl bg-slate-50 p-4"><ReadOnlyEmail email={email} /><PasswordField id="invite-password" label="Password" value={password} onChange={setPassword} show={show} setShow={setShow} autoComplete="current-password" /></div>
    <FormMessage message={message} /><Button className="h-11 w-full bg-slate-950 text-white hover:bg-slate-800" disabled={pending}>{pending ? 'Signing in…' : 'Sign in & accept invitation'}</Button>
    <Link className="block text-center text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-950" href={`/forgot-password?callbackURL=${encodeURIComponent(`/setup-account?token=${token}`)}`}>Forgot password?</Link>
  </form>

  return <form onSubmit={submit} className="space-y-5" noValidate>
    <FormHeading title="Create your password" description="Choose a secure password to activate your account." />
    <div className="space-y-4 rounded-xl bg-slate-50 p-4"><ReadOnlyEmail email={email} /><PasswordField id="invite-password" label="New password" value={password} onChange={setPassword} show={show} setShow={setShow} autoComplete="new-password" /><PasswordField id="invite-confirm" label="Confirm password" value={confirm} onChange={setConfirm} show={show} setShow={setShow} autoComplete="new-password" /><p className="flex items-center gap-1.5 text-xs leading-5 text-slate-500"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />Use at least 8 characters. This password is private to you.</p></div>
    <FormMessage message={message} /><Button className="h-11 w-full bg-slate-950 text-white hover:bg-slate-800" disabled={pending}>{pending ? 'Creating account…' : 'Accept invitation & continue'}</Button>
  </form>
}

function FormHeading({ title, description }: { title: string; description: string }) { return <div><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><LockKeyhole className="h-5 w-5" /></div><h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2><p className="mt-1.5 text-sm leading-5 text-slate-600">{description}</p></div> }
function ReadOnlyEmail({ email }: { email?: string }) { return <div><label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor="invite-email">Email</label><Input id="invite-email" value={email || ''} readOnly className="h-11 border-slate-200 bg-white text-slate-600 shadow-none" /></div> }
function FormMessage({ message }: { message: string }) { return message ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{message}</p> : null }
function StatusPanel({ icon: Icon, tone, title, description, action }: { icon: typeof CheckCircle2; tone: 'success' | 'pending'; title: string; description: string; action: React.ReactNode }) { const colors = tone === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'; return <div className="space-y-5 py-2 text-center"><span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${colors}`}><Icon className="h-6 w-6" aria-hidden="true" /></span><div><h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>{action}</div> }
function PasswordField({ id, label, value, onChange, show, setShow, autoComplete }: { id: string; label: string; value: string; onChange: (value: string) => void; show: boolean; setShow: (value: boolean) => void; autoComplete: string }) { return <div><label className="mb-1.5 block text-sm font-medium text-slate-800" htmlFor={id}>{label}</label><div className="relative"><Input id={id} type={show ? 'text' : 'password'} minLength={8} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} required className="h-11 border-slate-200 bg-white pr-11 shadow-none focus-visible:border-amber-500 focus-visible:ring-amber-200"/><button className="absolute right-3 top-3 text-slate-400 transition-colors hover:text-slate-700" type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div> }
