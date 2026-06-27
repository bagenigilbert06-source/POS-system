'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeSwitcher } from '@/components/theme-switcher'

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#industries', label: 'Industries' },
    { href: '#faq', label: 'FAQ' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border elevation-0 transition-all duration-200">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm group hover:opacity-80 transition-opacity">
          <img src="/imara-logo.png" alt="IMARA" className="h-8 w-auto" />
        </Link>

        {/* Desktop nav - MD3 Label Style */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-md3-label-large text-on-surface-variant hover:text-foreground transition-colors duration-200 relative group"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeSwitcher />
          <Link
            href="/sign-in"
            className="md3-btn-text"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="md3-btn-filled"
          >
            Start free
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-foreground hover:bg-secondary/40 rounded-full transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu - MD3 Surfaces */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block text-md3-label-large text-on-surface-variant hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-md3-label-medium text-on-surface-variant">Theme</span>
                <ThemeSwitcher />
              </div>
              <Link
                href="/sign-in"
                className="block text-md3-label-large text-center text-foreground hover:text-primary transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="md3-btn-filled justify-center w-full"
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
