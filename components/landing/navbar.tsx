'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Zap } from 'lucide-react'
import { ThemeSwitcher } from '@/components/theme-switcher'

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#industries', label: 'Industries' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-md border-b border-border fluent-shadow-2'
          : 'bg-background border-b border-transparent'
      }`}
    >
      <div className="container-wide flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center group-hover:bg-primary/90 transition-colors">
            <Zap className="h-4 w-4 text-white fill-white" />
          </div>
          <span className="text-base font-bold tracking-tight">Imara</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:text-foreground hover:bg-secondary transition-all duration-150"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeSwitcher />
          <Link href="/sign-in" className="fluent-btn-ghost">
            Sign in
          </Link>
          <Link href="/sign-up" className="fluent-btn-primary">
            Get Started
          </Link>
        </div>

        {/* Mobile toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeSwitcher />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container-wide py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-medium text-muted-foreground rounded-lg hover:text-foreground hover:bg-secondary transition-all"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 mt-2 border-t border-border flex flex-col gap-2">
              <Link href="/sign-in" onClick={() => setMobileOpen(false)} className="fluent-btn-secondary justify-center">
                Sign in
              </Link>
              <Link href="/sign-up" onClick={() => setMobileOpen(false)} className="fluent-btn-primary justify-center">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
