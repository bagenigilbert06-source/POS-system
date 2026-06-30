import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    // Force light mode — onboarding is always light regardless of user theme
    <div className="min-h-screen flex flex-col" style={{ background: '#ffffff', colorScheme: 'light' }}>

      {/* ── Top nav ── */}
      <header
        className="h-[60px] flex-shrink-0 flex items-center px-8"
        style={{ borderBottom: '1px solid #f0f0f0', background: '#ffffff' }}
      >
        <div className="flex items-center justify-between w-full max-w-[860px] mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="h-[30px] w-[30px] rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: '#1a56db' }}
            >
              <Image
                src="/imara-logo.png"
                alt="IMARA"
                width={30}
                height={30}
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <span
              className="text-[15px] font-bold tracking-tight"
              style={{ color: '#111827', fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
            >
              IMARA
            </span>
          </Link>

          <a
            href="mailto:support@imara.co.ke"
            className="text-[13px] transition-colors"
            style={{ color: '#9ca3af', fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
          >
            Need help?
          </a>
        </div>
      </header>

      {/* ── Body ── */}
      <main
        className="flex-1 flex flex-col items-center py-14 px-4"
        style={{ background: '#ffffff' }}
      >
        <div className="w-full max-w-[800px]">
          {children}
        </div>
      </main>

    </div>
  )
}
