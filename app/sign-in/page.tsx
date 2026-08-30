import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { IconLockAccess, IconReceipt } from '@tabler/icons-react'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth/auth-form'
import { PosAccessForm } from '@/components/auth/pos-access-form'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'

export const metadata: Metadata = { title: 'Sign In' }

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ pos?: string }> }) {
  const { pos } = await searchParams
  const isPosLogin = pos === '1'
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user && !isPosLogin) redirect('/dashboard')

  return (
    <main className="auth-workspace relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f4f6f8] p-3 text-slate-950 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-[#ffda32]/10 blur-3xl" />
        <div className="absolute -bottom-48 right-0 h-[30rem] w-[30rem] rounded-full bg-[#e42527]/5 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-[1220px] overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/80 xl:min-h-[min(760px,calc(100dvh-64px))] xl:grid-cols-[56%_44%]">
        <section className="relative hidden bg-[#ffda32] xl:flex xl:flex-col">
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute -left-28 top-28 h-[33rem] w-[39rem] rounded-[48%_52%_57%_43%/42%_48%_52%_58%] bg-[#fff8dc]/75" />
            <div className="absolute left-20 top-44 h-28 w-28 rounded-full border-[22px] border-white/35" />
            <div className="absolute bottom-16 right-20 h-16 w-16 rounded-full bg-white/45" />
            <div className="absolute right-28 top-28 h-8 w-8 rounded-full bg-[#e42527]/80" />
          </div>

          <div className="relative z-10 flex items-center justify-between px-10 pt-9 xl:px-12">
            <Link href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950">
              <PesabyLogoMark className="h-11 w-11" />
              <span className="leading-none">
                <span className="block text-xl font-black tracking-tight text-slate-950">Pesaby</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Business OS</span>
              </span>
            </Link>
            <span className="rounded-full border border-black/10 bg-white/55 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-700">
              Built for business
            </span>
          </div>

          <div className="relative z-10 flex flex-1 items-center justify-center px-8 pt-5">
            <Image
              src="/auth/pesaby-pos-login.png"
              alt="Shop owner managing a sale with the Pesaby point-of-sale system"
              width={1536}
              height={1024}
              priority
              sizes="(min-width: 1024px) 680px, 0px"
              className="w-full max-w-[680px] object-contain drop-shadow-[0_24px_28px_rgba(82,59,0,0.18)]"
            />
          </div>

          <div className="relative z-10 px-10 pb-9 xl:px-12">
            <p className="max-w-lg text-2xl font-black leading-tight tracking-[-0.035em] text-slate-950">
              Keep your store moving.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              Sales, stock, and shifts — all in sync.
            </p>
          </div>

          <svg
            className="pointer-events-none absolute -right-[74px] top-0 z-20 h-full w-[112px]"
            viewBox="0 0 112 800"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              fill="#ffda32"
              d="M0 0h41c47 77 61 149 31 226-27 70-25 129 8 190 34 64 35 129 4 195-27 57-29 120-4 189H0V0Z"
            />
          </svg>
        </section>

        <section className="relative flex items-center justify-center bg-[#fffdfa] px-5 py-7 sm:px-10 sm:py-10 xl:pl-24 xl:pr-12">
          <div className="w-full max-w-[410px]">
            <div className="mb-8 flex items-center justify-between xl:hidden">
              <Link href="/" className="flex items-center gap-3">
                <PesabyLogoMark className="h-10 w-10" />
                <span className="text-lg font-black tracking-tight text-slate-950">Pesaby</span>
              </Link>
              {!isPosLogin && (
                <Link href="/sign-up" className="text-sm font-bold text-[#c91f21] underline-offset-4 hover:underline">
                  Create account
                </Link>
              )}
            </div>

            <div className="mb-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffda32] text-slate-950 shadow-sm ring-1 ring-black/5">
                  {isPosLogin
                    ? <IconReceipt className="h-5 w-5" stroke={1.8} aria-hidden="true" />
                    : <IconLockAccess className="h-5 w-5" stroke={1.8} aria-hidden="true" />}
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-500">
                  {isPosLogin ? 'Secure terminal access' : 'Secure workspace access'}
                </span>
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-[-0.035em] text-slate-950">
                {isPosLogin ? 'Unlock your POS' : 'Welcome back'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {isPosLogin
                  ? 'Use your staff PIN or account password to continue.'
                  : 'Sign in to manage your business and continue where you left off.'}
              </p>
            </div>

            {isPosLogin ? <PosAccessForm /> : <AuthForm mode="sign-in" />}

            <p className="mt-7 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              © {new Date().getFullYear()} Pesaby · Business made simpler
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
