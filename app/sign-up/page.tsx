import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth/auth-form'
import type { Metadata } from 'next'
import { BarChart3, PackageCheck, ReceiptText, Sparkles, Store, UsersRound } from 'lucide-react'

export const metadata: Metadata = { title: 'Sign Up' }

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#fbfaf6] text-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[#071f18] px-10 py-8 text-white lg:flex lg:flex-col">
          <a href="/" className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-200" />
              <span className="text-xl font-black tracking-tight text-[#005a43]">P</span>
            </span>
            <span className="leading-none">
              <span className="block text-lg font-black tracking-tight text-white">Pesaby</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/60">Business OS</span>
            </span>
          </a>

          <div className="flex flex-1 items-center">
            <div className="w-full max-w-xl">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-200">Guided setup included</p>
              <h2 className="max-w-lg text-5xl font-black leading-[1.03] tracking-tight text-white">
                Launch a cleaner way to run daily commerce.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-emerald-50/75">
                Create your account, choose your business template, and we will prepare the right dashboard for your operations.
              </p>

              <div className="mt-10 rounded-xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#005a43]">
                    <Store className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-white">Workspace preview</p>
                    <p className="text-xs text-emerald-100/60">Configured from onboarding</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    [ReceiptText, 'POS', 'Ready'],
                    [PackageCheck, 'Inventory', 'Seeded'],
                    [BarChart3, 'Reports', 'Live'],
                  ].map(([Icon, label, value]) => (
                    <div key={label as string} className="rounded-lg border border-white/10 bg-white/10 p-4">
                      <Icon className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                      <p className="mt-3 text-[11px] font-bold text-emerald-100/60">{label as string}</p>
                      <p className="mt-1 text-lg font-black text-white">{value as string}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm font-semibold text-emerald-50/80 sm:grid-cols-2">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                  Premium onboarding
                </span>
                <span className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                  Team-ready controls
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs font-medium text-emerald-100/50">&copy; {new Date().getFullYear()} Pesaby. All rights reserved.</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[430px] rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-950/5 sm:p-8">
            <div className="mb-8 lg:hidden">
              <a href="/" className="flex items-center gap-3">
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#005a43] shadow-sm">
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-200" />
                  <span className="text-xl font-black tracking-tight text-white">P</span>
                </span>
                <span className="text-lg font-black tracking-tight text-zinc-950">Pesaby</span>
              </a>
            </div>

            <div className="mb-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#005a43]">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <h1 className="mb-2 text-3xl font-black tracking-tight text-zinc-950">Create account</h1>
              <p className="text-sm leading-6 text-zinc-600">Start with a guided setup tailored to your business.</p>
            </div>
            <AuthForm mode="sign-up" />
          </div>
        </section>
      </div>
    </main>
  )
}
