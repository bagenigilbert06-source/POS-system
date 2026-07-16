import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth/auth-form'
import type { Metadata } from 'next'
import { IconLockAccess, IconPackages, IconReceipt, IconShieldCheck } from '@tabler/icons-react'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'

export const metadata: Metadata = { title: 'Sign In' }

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#fff4e8] font-sans text-slate-950 [font-feature-settings:'ss01','cv02','cv03']">
      <div className="grid min-h-screen lg:grid-cols-[47%_53%]">
        <section className="hidden border-r border-black/10 bg-[#ffda32] px-14 py-8 text-slate-950 lg:flex lg:flex-col">
          <a href="/" className="flex items-center gap-3">
            <PesabyLogoMark className="h-10 w-10" />
            <span className="leading-none">
              <span className="block text-lg font-black tracking-tight text-slate-950">Pesaby</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Business OS</span>
            </span>
          </a>

          <div className="flex flex-1 items-center">
            <div className="w-full max-w-xl">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e42527]">Welcome back</p>
              <h2 className="max-w-lg text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] text-slate-950">
                Your business, ready when you are.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-700">
                Sign in to manage sales, inventory, employees, customers, expenses and business performance from one secure workspace.
              </p>

              <div className="mt-10 space-y-4 border-t border-black/10 pt-6 text-sm font-semibold text-slate-700">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-950"><IconReceipt className="h-[18px] w-[18px]" stroke={1.8} aria-hidden="true" /></span><div><p>See what is happening</p><p className="mt-1 font-normal leading-5">View sales, stock levels, expenses and recent activity in real time.</p></div></div>
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-950"><IconPackages className="h-[18px] w-[18px]" stroke={1.8} aria-hidden="true" /></span><div><p>Keep your team connected</p><p className="mt-1 font-normal leading-5">Manage staff access and keep daily operations organised.</p></div></div>
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-950"><IconShieldCheck className="h-[18px] w-[18px]" stroke={1.8} aria-hidden="true" /></span><div><p>Make informed decisions</p><p className="mt-1 font-normal leading-5">Use clear reports and insights to understand business performance.</p></div></div>
              </div>
              <p className="mt-6 text-sm font-semibold text-slate-800">Secure access to everything you need to run your business.</p>
            </div>
          </div>

          <p className="text-xs font-medium text-slate-500">&copy; {new Date().getFullYear()} Pesaby. All rights reserved.</p>
        </section>

        <section className="flex items-center justify-center bg-[#fff4e8] px-5 py-10 sm:px-8">
          <div className="w-full max-w-[440px] border-0 bg-transparent p-0 shadow-none sm:p-8">
            <div className="mb-8 lg:hidden">
              <a href="/" className="flex items-center gap-3">
                <PesabyLogoMark className="h-10 w-10" />
                <span className="text-lg font-black tracking-tight text-slate-950">Pesaby</span>
              </a>
            </div>

            <div className="mb-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#ffda32] text-slate-950">
                <IconLockAccess className="h-5 w-5" stroke={1.8} aria-hidden="true" />
              </div>
              <h1 className="mb-2 text-3xl font-extrabold tracking-[-0.035em] text-slate-950">Welcome back</h1>
              <p className="text-sm leading-6 text-zinc-600">Sign in to continue to your Pesaby workspace.</p>
            </div>
            <AuthForm mode="sign-in" />
          </div>
        </section>
      </div>
    </main>
  )
}
