'use client'

import { useState } from 'react'
import { CheckCircle2, Mail, Send } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ForgotPasswordForm({ callbackURL }: { callbackURL?: string }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const redirectTo = callbackURL?.startsWith('/') && !callbackURL.startsWith('//')
    ? callbackURL
    : '/setup-account'

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const result = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${window.location.origin}${redirectTo}`,
      })
      if (result.error) throw new Error(result.error.message)
      setSent(true)
    } catch {
      setError('We could not send the reset link. Please try again shortly.')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div className="py-2 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-[-0.025em] text-slate-950">Check your inbox</h2>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          If an account exists for <strong className="font-semibold text-slate-900">{email}</strong>, we&apos;ve sent a secure password-reset link. It expires in one hour.
        </p>
        {callbackURL && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            After resetting your password, you&apos;ll return to your employee invitation.
          </p>
        )}
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <label className="block text-sm font-semibold text-slate-800" htmlFor="reset-email">
        Work email
        <div className="relative mt-2">
          <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            className="h-11 border-slate-300 bg-white pl-10 shadow-sm focus-visible:ring-[#ffbf00]"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
      <Button className="h-11 w-full bg-[#e42527] text-white shadow-sm hover:bg-[#c91f21]" disabled={pending}>
        {pending ? 'Sending reset link…' : <>Send reset link <Send className="ml-2 h-4 w-4" /></>}
      </Button>
      <p className="text-center text-xs leading-5 text-slate-500">For your security, we only send a link if the email has a Pesaby account.</p>
    </form>
  )
}
