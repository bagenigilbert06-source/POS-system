import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

function safeInternalPath(value: string | undefined) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : undefined
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string; returnTo?: string }> }) {
  const { token, error, returnTo } = await searchParams
  const validToken = !error && token?.trim() ? token : undefined

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#fffdfa] px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-[#ffda32]/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#e42527]/10 blur-3xl" aria-hidden="true" />
      <section className="relative w-full max-w-[440px] rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:p-8">
        <Link href="/" className="inline-flex items-center gap-2 rounded-lg text-slate-950"><PesabyLogoMark className="h-10 w-10" /><span className="text-lg font-black tracking-tight">Pesaby</span></Link>
        <h1 className="mt-9 text-3xl font-bold tracking-[-0.035em] text-slate-950">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Choose a strong password for your Pesaby account.</p>
        <div className="mt-7"><ResetPasswordForm token={validToken} returnTo={safeInternalPath(returnTo)} /></div>
        <Link href="/sign-in" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 underline-offset-4 hover:text-[#c91f21] hover:underline"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>
      </section>
    </main>
  )
}
