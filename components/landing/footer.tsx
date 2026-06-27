import Link from 'next/link'
import { Zap } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Features',   href: '#features' },
    { label: 'Industries', href: '#industries' },
    { label: 'Security',   href: '#' },
    { label: 'Changelog',  href: '#' },
  ],
  Company: [
    { label: 'About',    href: '#' },
    { label: 'Blog',     href: '#' },
    { label: 'Careers',  href: '#' },
    { label: 'Contact',  href: 'mailto:hello@imara.co' },
  ],
  Support: [
    { label: 'Documentation',   href: '#' },
    { label: 'Help Center',     href: '#' },
    { label: 'Status',          href: '#' },
    { label: 'Contact Support', href: '#' },
  ],
  Legal: [
    { label: 'Terms',   href: '#' },
    { label: 'Privacy', href: '#' },
    { label: 'Cookies', href: '#' },
  ],
}

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="container-wide py-16">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-5 group">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="text-base font-bold tracking-tight">Imara</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
              Business operating system built for African entrepreneurs.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, items]) => (
            <div key={group}>
              <p className="text-[11px] font-semibold text-foreground mb-4 uppercase tracking-widest">
                {group}
              </p>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
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
        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {year} Imara Technologies Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {['X (Twitter)', 'LinkedIn', 'Facebook'].map((social) => (
              <Link
                key={social}
                href="#"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                {social}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
