import React from 'react'
import Image from 'next/image'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left brand panel ── */}
      <aside
        className="hidden lg:flex lg:w-[400px] xl:w-[440px] flex-shrink-0 flex-col"
        style={{ background: '#0b1f3a' }}
      >
        <div className="flex flex-col h-full px-10 py-10 xl:px-12">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: '#1a56db' }}
            >
              <Image
                src="/imara-logo.png"
                alt="IMARA"
                width={36}
                height={36}
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">IMARA</span>
          </div>

          {/* Hero copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-10">
              <h1 className="text-[28px] xl:text-[32px] font-bold text-white leading-[1.25] tracking-tight mb-4">
                The operating system<br />for your business
              </h1>
              <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Manage sales, inventory, payments, and analytics — all from one platform built for African businesses.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-5 mb-12">
              {[
                { label: 'Smart POS & Checkout',  sub: 'Fast, reliable with M-Pesa integration' },
                { label: 'Real-time Analytics',   sub: 'Insights that help you grow' },
                { label: 'Inventory Control',     sub: 'Never run out of stock again' },
                { label: 'Multi-user Access',     sub: 'Roles and permissions for your team' },
              ].map((f) => (
                <li key={f.label} className="flex items-start gap-3.5">
                  <span
                    className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(26,86,219,0.35)', border: '1px solid rgba(26,86,219,0.5)' }}
                  >
                    <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5">
                      <path d="M2 5l2 2 4-4" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{f.label}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.sub}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Trust badge */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {['#3b82f6','#10b981','#f59e0b','#ef4444'].map((c, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full border-[2px] flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: c, borderColor: '#0b1f3a' }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Trusted by{' '}
                <span className="font-semibold text-white">1,200+</span>{' '}
                businesses in Kenya
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-[11px] mt-8" style={{ color: 'rgba(255,255,255,0.25)' }}>
            &copy; {new Date().getFullYear()} IMARA. All rights reserved.
          </p>
        </div>
      </aside>

      {/* ── Right content panel ── */}
      <main className="flex flex-1 flex-col overflow-y-auto" style={{ background: '#f8fafc' }}>

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-2.5 px-6 py-5 bg-white border-b border-gray-100">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: '#1a56db' }}
          >
            <Image
              src="/imara-logo.png"
              alt="IMARA"
              width={32}
              height={32}
              className="object-contain w-full h-full"
            />
          </div>
          <span className="text-[17px] font-bold text-gray-900 tracking-tight">IMARA</span>
        </header>

        {/* Scrollable form content */}
        <div className="flex flex-1 items-start justify-center px-6 py-10 md:px-10 lg:px-14 xl:px-16">
          <div className="w-full max-w-[600px]">
            {children}
          </div>
        </div>
      </main>

    </div>
  )
}
