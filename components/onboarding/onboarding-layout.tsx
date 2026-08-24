import React from 'react'
import Link from 'next/link'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="onboarding-workspace min-h-dvh bg-[#fff9ef] text-slate-950" style={{ colorScheme: 'light' }}>
      <header className="h-12 px-5 sm:h-14 sm:px-6">
        <div className="mx-auto flex h-full max-w-[1040px] items-center">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]">
            <PesabyLogoMark className="h-8 w-8" />
            <span className="leading-none">
              <span className="block text-sm font-extrabold tracking-tight text-slate-950">Pesaby</span>
              <span className="block text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-500">Business OS</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="relative flex min-h-[calc(100dvh-56px)] items-center justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#e42527_0_33%,#ffda32_33%_66%,#050816_66%)]" />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,218,50,0.18),transparent_28%),radial-gradient(circle_at_90%_85%,rgba(228,37,39,0.06),transparent_30%)]" />

        <div className="relative w-full max-w-[1000px] overflow-hidden rounded-2xl border border-black/10 bg-white px-4 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.09)] sm:px-8 sm:py-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  )
}
