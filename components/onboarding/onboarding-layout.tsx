import React from 'react'
import Link from 'next/link'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fff9ef] font-sans text-slate-950 [font-feature-settings:'ss01','cv02','cv03']" style={{ colorScheme: 'light' }}>
      <header className="h-[72px] border-b border-black/10 bg-white px-5">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <PesabyLogoMark className="h-10 w-10" />
            <span className="leading-none">
              <span className="block text-base font-extrabold tracking-tight text-slate-950">Pesaby</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">Business OS</span>
            </span>
          </Link>

          <a
            href="mailto:support@pesaby.co.ke"
            className="rounded-md px-3 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-[#fff4cf] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
          >
            Need help?
          </a>
        </div>
      </header>

      <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#e42527_0_33%,#ffda32_33%_66%,#050816_66%)]" />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,218,50,0.18),transparent_28%),radial-gradient(circle_at_90%_85%,rgba(228,37,39,0.06),transparent_30%)]" />

        <div className="relative w-full max-w-[1040px] overflow-hidden rounded-2xl border border-black/10 bg-white px-4 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:px-8 sm:py-9 lg:px-12">
          {children}
        </div>
      </main>
    </div>
  )
}
