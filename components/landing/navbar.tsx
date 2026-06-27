'use client'

import Link from 'next/link'
import { Menu, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeSwitcher } from '@/components/theme-switcher'

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#industries', label: 'Industries' },
  { href: '#why-imara', label: 'Why Imara' },
  { href: '#faq', label: 'Resources' },
  { href: 'mailto:hello@imara.co', label: 'Contact' },
]

function ImaraLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-semibold tracking-tight text-foreground">Imara</span>
        <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:block">Business OS</span>
      </span>
    </Link>
  )
}

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
      <div className="container-wide flex h-18 items-center justify-between py-4">
        <ImaraLogo />

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeSwitcher />
          <Button asChild variant="ghost" className="font-semibold">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild className="h-11 rounded-xl px-5 font-semibold shadow-md shadow-blue-600/15">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeSwitcher />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[88vw] max-w-sm">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="mb-8">
                <ImaraLogo />
              </div>
              <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.label}>
                    <Link href={link.href} className="rounded-lg px-3 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-8 grid gap-3 border-t border-border pt-6">
                <SheetClose asChild>
                  <Button asChild variant="outline" className="h-11 rounded-xl">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild className="h-11 rounded-xl">
                    <Link href="/sign-up">Get Started</Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
