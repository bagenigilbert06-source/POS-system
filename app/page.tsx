import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CreditCard,
  Headphones,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UserCog,
  UsersRound,
  Zap,
} from 'lucide-react'

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Security', href: '#security' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Why Pesaby', href: '#why' },
]

const stats = [
  ['8,500+', 'Active Businesses'],
  ['50+', 'Daily Workflows'],
  ['1M+', 'Transactions/Day'],
]

const features = [
  { icon: ReceiptText, title: 'Lightning Checkout', desc: 'Fast, intuitive POS with support for all payment methods' },
  { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Detailed insights into sales, inventory, and performance' },
  { icon: UsersRound, title: 'Customer Management', desc: 'Build relationships with loyalty tracking and history' },
  { icon: Store, title: 'Multi-Branch Control', desc: 'Manage unlimited locations from one dashboard' },
  { icon: CreditCard, title: 'Payments Processing', desc: 'Accept all payment methods instantly and securely' },
  { icon: Sparkles, title: 'Smart Inventory', desc: 'Real-time stock tracking with automated alerts' },
]

const footerLinks = {
  Product: ['Point of Sale', 'Inventory', 'Payments', 'Customers', 'Reports'],
  Company: ['Why Pesaby', 'Industries', 'Security', 'Careers', 'Contact'],
  Support: ['Getting Started', 'Training', 'Help Center', 'API Docs', 'Status'],
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-green-200" />
        <span className="text-lg font-bold text-primary-foreground">P</span>
      </div>
      <span>
        <span className="block text-sm font-bold text-foreground">Pesaby</span>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Business OS</span>
      </span>
    </Link>
  )
}

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex text-sm">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="hidden px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/20"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-28 md:pt-32 md:pb-40">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary animate-fade-up">
                <Sparkles className="h-3.5 w-3.5" />
                Trusted by 8,500+ Businesses
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight animate-fade-up animate-delay-100">
                The Modern POS System for Growing Businesses
              </h1>

              <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up animate-delay-200">
                Complete point of sale, inventory management, and analytics platform designed for retailers, restaurants, pharmacies, and more.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-up animate-delay-300">
                <Link
                  href="/sign-up"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="mailto:sales@pesaby.com"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-8 text-sm font-semibold text-foreground transition-all hover:bg-card/80 hover:border-primary/50"
                >
                  Schedule Demo
                </Link>
              </div>

              <p className="mt-6 text-xs text-muted-foreground animate-fade-up animate-delay-400">
                30-day free trial • No credit card required • 24/7 support
              </p>
            </div>

            {/* Hero Mockup */}
            <div className="mt-20 animate-fade-up animate-delay-500">
              <div className="relative mx-auto max-w-4xl rounded-2xl border border-border/50 bg-card/50 backdrop-blur p-1 shadow-2xl">
                <div className="rounded-xl bg-gradient-to-b from-card to-card/80 p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Live Register</p>
                      <div className="space-y-3">
                        {['Arabica Coffee - 2x', 'Milk 500ml - 4x', 'Sugar 1kg - 1x'].map((item, i) => (
                          <div key={i} className="flex justify-between items-center pb-3 border-b border-border/30">
                            <span className="text-sm text-foreground">{item}</span>
                            <span className="font-semibold text-primary">KES {(i + 1) * 100}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 rounded-lg bg-primary/10 border border-primary/20 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                        <p className="text-2xl font-bold text-primary">KES 1,610</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Today&apos;s Metrics</p>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Revenue', value: '842K' },
                          { label: 'Orders', value: '284' },
                          { label: 'Items Sold', value: '1.2K' },
                          { label: 'Margin', value: '31%' },
                        ].map((metric, i) => (
                          <div key={i} className="rounded-lg bg-card border border-border/40 p-4">
                            <p className="text-xs text-muted-foreground mb-2">{metric.label}</p>
                            <p className="text-xl font-bold text-primary">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-t border-border/40 bg-card/30 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {stats.map(([value, label], i) => (
                <div key={i} className="text-center animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <p className="text-4xl md:text-5xl font-bold text-primary">{value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Everything you need to run your business efficiently and profitably.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="group relative rounded-xl border border-border/40 bg-card p-8 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:bg-card/80 animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <feature.icon className="h-8 w-8 text-primary mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="border-t border-border/40 bg-card/30 py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="animate-fade-in-right">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">Enterprise Security</h2>
                <p className="text-muted-foreground mb-8 text-lg">Your business data is protected with industry-leading security standards.</p>
                <ul className="space-y-4">
                  {[
                    'End-to-end encryption',
                    'Role-based access control',
                    'Automatic daily backups',
                    'PCI-DSS compliance',
                    'GDPR ready',
                    'Complete audit trails',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="animate-fade-in-left">
                <div className="rounded-xl border border-border/40 bg-card p-12 flex items-center justify-center aspect-square">
                  <LockKeyhole className="h-32 w-32 text-primary/30" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Section */}
        <section id="why" className="py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose Pesaby</h2>
              <p className="text-muted-foreground text-lg">Built by business owners, for business owners.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Sparkles, title: 'Easy Setup', desc: 'Get up and running in minutes, not hours or days.' },
                { icon: Headphones, title: 'Expert Support', desc: 'Always available to help you succeed with your business.' },
                { icon: ShieldCheck, title: 'Reliable Platform', desc: 'Built on enterprise infrastructure you can trust.' },
              ].map((item, i) => (
                <div key={i} className="text-center animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <item.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="border-t border-border/40 bg-card/30 py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                <span className="text-2xl font-bold">4.8/5</span>
              </div>
              <h2 className="text-4xl font-bold mb-4">Loved by Business Owners</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: 'Sarah Chen', role: 'Retail Owner', text: 'Pesaby transformed how we manage inventory and sales. Incredibly intuitive.' },
                { name: 'James Okafor', role: 'Restaurant Manager', text: 'The best POS system we&apos;ve used. Fast, reliable, and the support is outstanding.' },
                { name: 'Amelia Williams', role: 'Pharmacy Owner', text: 'Real-time analytics help us make better decisions every day. Highly recommend!' },
              ].map((testimonial, i) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card p-8 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 text-sm">&quot;{testimonial.text}&quot;</p>
                  <p className="font-bold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-28 bg-gradient-to-br from-primary to-primary/90">
          <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-up">Ready to Transform Your Business?</h2>
            <p className="text-white/80 text-lg mb-10 animate-fade-up animate-delay-100 max-w-2xl mx-auto">
              Join thousands of businesses already using Pesaby to streamline operations and grow faster.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-up animate-delay-200">
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-8 text-sm font-semibold text-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl active:scale-95"
              >
                Start Your Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="mailto:sales@pesaby.com"
                className="inline-flex h-11 items-center justify-center rounded-lg border-2 border-white text-white px-8 text-sm font-semibold transition-all hover:bg-white/10"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/50">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <Logo />
            </div>
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm mb-4">{category}</h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>&copy; 2025 Pesaby. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
