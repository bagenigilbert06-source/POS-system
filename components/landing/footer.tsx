import Link from 'next/link'
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Features', href: '/features' },
    { label: 'Industries', href: '/industries' },
    { label: 'Why PESABY', href: '/#features' },
    { label: 'Pricing', href: '#' },
    { label: 'Changelog', href: '#' },
  ],
  Business: [
    { label: 'Point of Sale', href: '#' },
    { label: 'Inventory', href: '#' },
    { label: 'CRM', href: '#' },
    { label: 'Purchasing', href: '#' },
    { label: 'Analytics', href: '#' },
    { label: 'Multi-Branch', href: '#' },
  ],
  Company: [
    { label: 'About PESABY', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Press', href: '#' },
    { label: 'Contact', href: 'mailto:hello@pesaby.co' },
  ],
  Support: [
    { label: 'Help Center', href: '#' },
    { label: 'Onboarding Guide', href: '#' },
    { label: 'Status', href: '#' },
    { label: 'hello@pesaby.co', href: 'mailto:hello@pesaby.co' },
  ],
}

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'X / Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
]

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-[#242424] text-white">
      <div className="container-wide py-12 md:py-14">
        {/* Top: logo + tagline + social */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-12 md:mb-16">
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <div className="h-8 w-8 rounded-lg bg-[#ffda32] flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-950">P</span>
              </div>
              <span className="text-base font-bold tracking-tight text-white">PESABY</span>
            </Link>
            <p className="text-sm text-zinc-300 leading-relaxed">
              The complete Business Operating System for growing businesses. Run everything from one place.
            </p>
          </div>

          {/* Social */}
          <div>
            <p className="text-xs font-semibold text-white uppercase tracking-widest mb-4">Find Us</p>
            <div className="flex gap-2.5">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  className="h-9 w-9 rounded-lg border border-white/10 bg-[#2c2c2c] flex items-center justify-center text-zinc-300 hover:text-[#e42527] hover:border-[#e42527] transition-all duration-150"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Main link grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-12 md:mb-16">
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-white uppercase tracking-widest mb-4">{group}</h3>
              <ul className="space-y-3">
                {links.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-zinc-400 hover:text-[#e42527] transition-colors duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-zinc-400">
            &copy; {year} PESABY Technologies Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-xs text-zinc-400 hover:text-[#e42527] transition-colors">Terms</Link>
            <Link href="#" className="text-xs text-zinc-400 hover:text-[#e42527] transition-colors">Privacy</Link>
            <Link href="#" className="text-xs text-zinc-400 hover:text-[#e42527] transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
