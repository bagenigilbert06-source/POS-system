'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/theme-switcher'

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/industries', label: 'Industries' },
  { href: '/why-imara', label: 'Why IMARA' },
  { href: 'mailto:hello@imara.co', label: 'Contact' },
]

function IMARALogo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-sm font-bold text-white tracking-tight">I</span>
      </div>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-tight text-foreground">IMARA</span>
        <span className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:block">
          Business OS
        </span>
      </span>
    </Link>
  )
}

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="container-wide flex h-16 items-center justify-between">
        <IMARALogo />

        {/* Desktop nav */}
        <nav aria-label="Primary navigation" className="hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <ThemeSwitcher />
          <Button asChild variant="ghost" size="sm" className="font-semibold hover:bg-secondary">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-lg px-5 font-bold shadow-sm transition-all duration-150"
          >
            <Link href="/sign-up">Get Started Free</Link>
          </Button>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeSwitcher />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="container-wide py-4">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1 mb-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="grid gap-2 border-t border-border pt-4">
              <Button asChild variant="outline" className="h-11 rounded-lg font-semibold">
                <Link href="/sign-in" onClick={() => setMobileOpen(false)}>Sign In</Link>
              </Button>
              <Button asChild className="h-11 rounded-lg font-bold">
                <Link href="/sign-up" onClick={() => setMobileOpen(false)}>Get Started Free</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
