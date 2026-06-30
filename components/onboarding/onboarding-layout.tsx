import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface OnboardingLayoutProps {
  children: React.ReactNode
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Top nav bar ── */}
      <header className="h-16 flex-shrink-0 border-b border-gray-100 bg-white">
        <div className="h-full max-w-5xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
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
                priority
              />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-gray-900">IMARA</span>
          </Link>

          {/* Right side — subtle help link */}
          <a
            href="mailto:support@imara.co.ke"
            className="text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Need help?
          </a>
        </div>
      </header>

      {/* ── Page body ── */}
      <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16" style={{ background: '#f8fafc' }}>
        {/* Card */}
        <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 sm:px-12">
          {children}
        </div>
      </main>

    </div>
  )
}
