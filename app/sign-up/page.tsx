import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth/auth-form'
import type { Metadata } from 'next'
import { IconBuildingStore, IconSparkles, IconUserShield, IconUsersGroup } from '@tabler/icons-react'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Sign Up' }

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#fff4e8] font-sans text-slate-950 [font-feature-settings:'ss01','cv02','cv03']">
      <div className="grid min-h-screen lg:grid-cols-[47%_53%]">
        <section className="hidden border-r border-black/10 bg-[#ffda32] px-14 py-8 text-slate-950 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-3">
            <PesabyLogoMark className="h-10 w-10" />
            <span className="leading-none">
              <span className="block text-lg font-black tracking-tight text-slate-950">Pesaby</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Business OS</span>
            </span>
          </Link>

          <div className="flex flex-1 items-center">
            <div className="w-full max-w-xl">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e42527]">Get started in minutes</p>
              <h2 className="max-w-lg text-5xl font-extrabold leading-[1.02] tracking-[-0.045em] text-slate-950">
                Build a better way to run your business.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-700">
                Create your workspace and bring sales, inventory, employees, customers and reporting together in one connected platform.
              </p>

              <div className="mt-10 space-y-4 border-t border-black/10 pt-6 text-sm font-semibold text-slate-700">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-950"><IconSparkles className="h-[18px] w-[18px]" stroke={1.8} aria-hidden="true" /></span><div><p>Guided business setup</p><p className="mt-1 font-normal leading-5">Add your business details, products and locations step by step.</p></div></div>
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-950"><IconUsersGroup className="h-[18px] w-[18px]" stroke={1.8} aria-hidden="true" /></span><div><p>Manage your team</p><p className="mt-1 font-normal leading-5">Invite employees and control what each person can access.</p></div></div>
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-950"><IconBuildingStore className="h-[18px] w-[18px]" stroke={1.8} aria-hidden="true" /></span><div><p>One connected workspace</p><p className="mt-1 font-normal leading-5">Manage daily operations and track performance across every location.</p></div></div>
              </div>
              <p className="mt-6 text-sm font-semibold text-slate-800">Simple setup. Secure access. Ready to grow with your business.</p>
            </div>
          </div>

          <p className="text-xs font-medium text-slate-500">&copy; {new Date().getFullYear()} Pesaby. All rights reserved.</p>
        </section>

        <section className="flex items-center justify-center bg-[#fff4e8] px-5 py-10 sm:px-8">
          <div className="w-full max-w-[440px] border-0 bg-transparent p-0 shadow-none sm:p-8">
            <div className="mb-8 lg:hidden">
              <Link href="/" className="flex items-center gap-3">
                <PesabyLogoMark className="h-10 w-10" />
                <span className="text-lg font-black tracking-tight text-slate-950">Pesaby</span>
              </Link>
            </div>

            <div className="mb-8">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#ffda32] text-slate-950">
                <IconUserShield className="h-5 w-5" stroke={1.8} aria-hidden="true" />
              </div>
              <h1 className="mb-2 text-3xl font-extrabold tracking-[-0.035em] text-slate-950">Create your Pesaby account</h1>
              <p className="text-sm leading-6 text-zinc-600">Start your free setup and create your business workspace.</p>
            </div>
            <AuthForm mode="sign-up" />
          </div>
        </section>
      </div>
    </main>
  )
}
