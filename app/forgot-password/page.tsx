import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'

function safeInternalPath(value: string | undefined) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : undefined
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ callbackURL?: string }> }) {
  const { callbackURL } = await searchParams
  const invitationReturn = safeInternalPath(callbackURL)

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#fffdfa] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-[#ffda32]/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#e42527]/10 blur-3xl" aria-hidden="true" />

      <section className="relative w-full max-w-[440px] rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:p-8">
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg text-slate-950">
          <PesabyLogoMark className="h-10 w-10" />
          <span className="text-lg font-black tracking-tight">Pesaby</span>
        </Link>

        <h1 className="mt-9 text-3xl font-bold tracking-[-0.035em] text-slate-950">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the email address for your Pesaby account and we&apos;ll send a secure one-hour reset link.
        </p>

        {invitationReturn && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-950">
            <strong>Employee invitation saved.</strong> After resetting your password, you&apos;ll return here to accept it.
          </div>
        )}

        <div className="mt-7">
          <ForgotPasswordForm callbackURL={invitationReturn} />
        </div>

        <Link href="/sign-in" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 underline-offset-4 hover:text-[#c91f21] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </section>
    </main>
  )
}
