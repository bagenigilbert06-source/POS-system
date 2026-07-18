import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'

export default async function RestrictedPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  return <main className="flex min-h-screen items-center justify-center bg-[#fffaf0] px-5"><section className="w-full max-w-lg rounded-2xl border border-[#dfe3ea] bg-white p-8 text-center shadow-sm"><span className="inline-flex items-center gap-3"><PesabyLogoMark /><span className="text-xl font-extrabold text-[#050a1f]">Pesaby</span></span><p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e42527]">Account access</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#050a1f]">This account is restricted</h1><p className="mt-3 text-sm leading-6 text-[#667085]">Access to this Pesaby account is currently unavailable. Contact your workspace administrator or Pesaby support for help.</p></section></main>
}
