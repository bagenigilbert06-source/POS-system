import React from 'react'
import Link from 'next/link'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f5f8ff] text-zinc-950" style={{ colorScheme: 'light' }}>
      <header className="h-[64px] border-b border-zinc-200 bg-white px-5">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[#005a43] shadow-sm">
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-200" />
              <span className="text-lg font-black tracking-tight text-white">P</span>
            </span>
            <span className="leading-none">
              <span className="block text-base font-black tracking-tight text-zinc-950">Pesaby</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">Business OS</span>
            </span>
          </Link>

          <a
            href="mailto:support@pesaby.co.ke"
            className="text-sm font-semibold text-zinc-500 transition-colors hover:text-[#005a43]"
          >
            Need help?
          </a>
        </div>
      </header>

      <main className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden px-4 py-10">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute left-0 top-0 h-full w-full bg-[linear-gradient(140deg,#f7f8ff_0%,#eef5ff_50%,#eefaf6_100%)]" />
          <div className="absolute bottom-0 left-0 h-32 w-full bg-[radial-gradient(ellipse_at_bottom,#dcece7_0%,transparent_68%)]" />
          <div className="absolute left-[8%] top-[72%] h-8 w-8 rotate-12 rounded-md bg-yellow-300/70 blur-[1px]" />
          <div className="absolute right-[13%] top-[20%] h-14 w-14 rounded-2xl bg-yellow-200/80 blur-[2px]" />
          <div className="absolute right-[28%] top-[62%] h-14 w-14 rotate-12 rounded-2xl bg-red-400/70 blur-[2px]" />
          <div className="absolute left-[25%] top-[58%] h-6 w-6 rounded-md bg-red-300/50 blur-[3px]" />
        </div>

        <div className="relative w-full max-w-[760px] rounded-xl bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-zinc-200/80 sm:px-10 sm:py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
