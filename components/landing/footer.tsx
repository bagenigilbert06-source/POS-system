'use client'

import Link from 'next/link'
import { Building2 } from 'lucide-react'

export function LandingFooter() {
  const currentYear = new Date().getFullYear()

  const links = {
    Product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Industries', href: '#industries' },
      { label: 'FAQ', href: '#faq' },
    ],
    Company: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: 'mailto:support@bizos.ke' },
    ],
    Legal: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
      { label: 'Compliance', href: '#' },
    ],
  }

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-6 py-14 md:py-18">
        <div className="grid md:grid-cols-5 gap-10 md:gap-12 mb-14">
          {/* Brand - MD3 Typography */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-6 font-bold group hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-md3-title-large">IMARA</span>
            </Link>
            <p className="text-md3-body-medium text-on-surface-variant">
              Business OS for African entrepreneurs
            </p>
          </div>

          {/* Links - MD3 Link style */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-md3-title-medium text-foreground mb-5">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-md3-body-medium text-on-surface-variant hover:text-foreground transition-colors duration-200 relative group"
                    >
                      {item.label}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom - MD3 Divider and typography */}
        <div className="border-t border-border pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-md3-body-small text-on-surface-variant">
            &copy; {currentYear} IMARA. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <Link href="#" className="text-md3-body-medium text-on-surface-variant hover:text-foreground transition-colors duration-200">
              Twitter
            </Link>
            <Link href="#" className="text-md3-body-medium text-on-surface-variant hover:text-foreground transition-colors duration-200">
              Facebook
            </Link>
            <Link href="#" className="text-md3-body-medium text-on-surface-variant hover:text-foreground transition-colors duration-200">
              LinkedIn
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
