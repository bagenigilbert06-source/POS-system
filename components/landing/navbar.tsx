'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const navLinks = [
  { href: '/features', label: 'Product' },
  { href: '/#platform', label: 'Solutions' },
  { href: '/industries', label: 'Industries' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/resources', label: 'Resources' },
]

function PESABYLogo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Image
        src="/pesaby-logo.png"
        alt="PESABY"
        width={36}
        height={36}
        className="h-9 w-9 rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 object-contain"
        priority
      />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-tight text-foreground">
          PESABY
        </span>
        <span className="hidden text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:block">
          Business OS
        </span>
      </span>
    </Link>
  )
}

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="container-wide flex h-16 items-center justify-between">
        <PESABYLogo />

        {/* Desktop nav */}
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-0.5 lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-[#fff8f8] hover:text-[#e42527] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <Button asChild variant="ghost" size="sm" className="font-semibold text-slate-700 hover:bg-[#fff8f8] hover:text-[#e42527]">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-lg bg-[#e42527] px-5 font-bold text-white shadow-sm shadow-red-900/10 hover:bg-[#c91f21] hover:shadow-md transition-all duration-150"
          >
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="flex items-center gap-2 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              aria-label="Open navigation menu"
            >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[85vw] max-w-[340px]">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="mb-8 pt-1">
                <PESABYLogo />
              </div>
              <nav aria-label="Mobile navigation" className="flex flex-col gap-0.5">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.label}>
                    <Link
                      href={link.href}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-[#fff8f8] hover:text-[#e42527]"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-8 grid gap-3 border-t border-border pt-6">
                <SheetClose asChild>
                  <Button asChild variant="outline" className="h-12 rounded-xl font-semibold border-2">
                    <Link href="/sign-in">Sign In</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild className="h-12 rounded-lg bg-[#e42527] font-bold text-white shadow-sm shadow-red-900/10 hover:bg-[#c91f21]">
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
