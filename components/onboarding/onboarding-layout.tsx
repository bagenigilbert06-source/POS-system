import React from 'react'
import Image from 'next/image'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

/**
 * Zoho/Odoo-inspired two-panel onboarding layout.
 * Left: deep navy brand panel with logo, tagline, and trust indicators.
 * Right: clean white content area for wizard steps.
 */
export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel ── */}
      <aside className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0f2248 60%, #0d1e40 100%)' }}>

        {/* Subtle geometric background decoration */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #4a9eff 0%, transparent 70%)' }} />
          <div className="absolute bottom-20 -left-20 w-72 h-72 rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #4a9eff 0%, transparent 70%)' }} />
          {/* Grid dots */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }} />
        </div>

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 rounded-xl overflow-hidden flex-shrink-0 shadow-lg bg-blue-500 flex items-center justify-center">
              <Image
                src="/imara-logo.png"
                alt="IMARA logo"
                width={40}
                height={40}
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <span className="text-[22px] font-bold text-white tracking-tight">IMARA</span>
          </div>

          {/* Main brand copy */}
          <div className="flex-1 flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
                The operating system for your business
              </h1>
              <p className="text-base text-blue-200/70 leading-relaxed max-w-xs">
                Manage sales, inventory, payments, and analytics — all from one powerful platform built for Kenyan businesses.
              </p>
            </div>

            {/* Feature list */}
            <ul className="space-y-4">
              {[
                { label: 'Smart POS & Checkout', desc: 'Fast, reliable point-of-sale with M-Pesa' },
                { label: 'Real-time Analytics', desc: 'Insights that help you grow' },
                { label: 'Inventory Control', desc: 'Never run out of stock again' },
                { label: 'Multi-user Access', desc: 'Roles and permissions for your team' },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-1 h-5 w-5 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(74,158,255,0.15)', border: '1px solid rgba(74,158,255,0.3)' }}>
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#4a9eff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-blue-300/60 mt-0.5">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Trust badge */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex -space-x-1.5">
                {['#4a9eff', '#38b2ac', '#ed8936', '#9f7aea'].map((color, i) => (
                  <div key={i} className="h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ borderColor: '#0f2248', background: color }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-300/70">
                Trusted by <span className="text-white font-semibold">1,200+</span> businesses in Kenya
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-blue-400/40 mt-8">
            &copy; {new Date().getFullYear()} IMARA. All rights reserved.
          </p>
        </div>
      </aside>

      {/* ── Right content panel ── */}
      <main className="flex flex-1 flex-col bg-background overflow-y-auto">
        {/* Mobile logo bar */}
        <header className="lg:hidden flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="h-8 w-8 rounded-lg overflow-hidden">
            <Image
              src="/imara-logo.png"
              alt="IMARA logo"
              width={32}
              height={32}
              className="object-contain w-full h-full"
            />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">IMARA</span>
        </header>

        {/* Centered form content */}
        <div className="flex flex-1 items-start justify-center px-6 py-10 md:px-12 lg:px-16 xl:px-20">
          <div className="w-full max-w-[580px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
