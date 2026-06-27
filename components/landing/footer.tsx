import Link from 'next/link'
import { Zap, Facebook, Instagram, Twitter, Linkedin, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

const footerLinks = {
  Product: [
    { label: 'How it works',   href: '#' },
    { label: 'Shipping', href: '#' },
    { label: 'Invoicing',   href: '#' },
    { label: 'Returns',  href: '#' },
    { label: 'Tracking', href: '#' },
    { label: 'API', href: '#' },
  ],
  Integrations: [
    { label: 'Carriers',    href: '#' },
    { label: 'E-commerce platforms',     href: '#' },
    { label: 'Marketplaces',  href: '#' },
    { label: 'Warehouse management', href: '#' },
    { label: 'ERP systems', href: '#' },
  ],
  Company: [
    { label: 'About us',    href: '#' },
    { label: 'Jobs',     href: '#' },
    { label: 'Press',   href: '#' },
    { label: 'Partner with us',  href: '#' },
  ],
  Support: [
    { label: 'Help center',   href: '#' },
    { label: 'Developer docs',     href: '#' },
    { label: 'Service status',          href: '#' },
    { label: 'Contact', href: 'mailto:hello@imara.co' },
  ],
  Resources: [
    { label: 'Blog',   href: '#' },
    { label: 'Customer stories',     href: '#' },
    { label: 'Shipping tools',          href: '#' },
    { label: 'Pricing', href: '#' },
  ],
}

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
]

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background">
      <div className="container-wide py-20">
        {/* Top section with logo and CTA */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-16 gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-5 w-5 text-white fill-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">Imara</span>
            </Link>
            <div className="hidden md:block">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:opacity-80 transition-opacity"
              >
                Start for free →
              </Link>
            </div>
          </div>

          {/* Social and CTA on mobile */}
          <div className="md:hidden">
            <Link
              href="/sign-up"
              className="inline-block mb-6 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Start for free
            </Link>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-12 mb-16">
          {/* Product column */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">Product</h3>
            <ul className="space-y-4">
              {footerLinks.Product.map((item) => (
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

          {/* Integrations column */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">Integrations</h3>
            <ul className="space-y-4">
              {footerLinks.Integrations.map((item) => (
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

          {/* Company column */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">Company</h3>
            <ul className="space-y-4">
              {footerLinks.Company.map((item) => (
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

          {/* Find us on - Social Media */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">Find us on</h3>
            <div className="flex gap-3 mb-8">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
                  aria-label={label}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Support section */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">Support</h3>
            <ul className="space-y-4 mb-8">
              {footerLinks.Support.map((item) => (
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
        </div>

        {/* Bottom Section - Resources and Footer Info */}
        <div className="border-t border-border pt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            {/* Resources column */}
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-sm font-semibold text-foreground mb-6 uppercase tracking-wider">Resources</h3>
              <ul className="space-y-4">
                {footerLinks.Resources.map((item) => (
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

            {/* Spacer for grid alignment */}
            <div></div>
            <div></div>

            {/* Language selector and bottom info */}
            <div className="col-span-2 md:col-span-1 flex md:flex-col items-end md:items-start justify-between md:justify-start gap-4">
              <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Globe className="h-4 w-4" />
                <span className="text-sm">English</span>
              </div>
            </div>
          </div>

          {/* Footer bottom bar */}
          <div className="border-t border-border pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <p className="text-xs text-muted-foreground">
              &copy; {year} Imara Technologies Ltd. All rights reserved.
              <span className="mx-3 inline-block w-px h-3 bg-border"></span>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <span className="mx-3 inline-block w-px h-3 bg-border"></span>
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <span className="mx-3 inline-block w-px h-3 bg-border"></span>
              <Link href="#" className="hover:text-foreground transition-colors">Cookies</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
