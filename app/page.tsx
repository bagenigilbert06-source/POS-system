import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Check,
  ChevronDown,
  CreditCard,
  Headphones,
  LockKeyhole,
  Mail,
  PackageCheck,
  Plug,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  UserCog,
  UsersRound,
  WalletCards,
  Zap,
  TrendingUp,
  Layers,
  Gauge,
  Clock,
} from 'lucide-react'

const navItems = [
  {
    label: 'Features',
    href: '#features',
    menu: ['Point of sale', 'Inventory control', 'Payments', 'Customer records'],
  },
  {
    label: 'Platform',
    href: '#platform',
    menu: ['Commerce suite', 'Branch operations', 'Security', 'Analytics'],
  },
  { label: 'Pricing', href: '#pricing' },
  {
    label: 'Industries',
    href: '#industries',
    menu: ['Retail', 'Restaurants', 'Pharmacies', 'Hardware'],
  },
  {
    label: 'Success Stories',
    href: '#customers',
    menu: ['Customer proof', 'Implementation', 'Support'],
  },
  {
    label: 'Resources',
    href: '#resources',
    menu: ['Guides', 'Training', 'API docs', 'Help center'],
  },
  { label: 'Concierge', href: '#concierge' },
]

const industryCards = [
  { name: 'Retail', image: '/images/industries/retail.png', line: 'Fast counters, stock alerts, loyalty, and daily sales reports.' },
  { name: 'Restaurants', image: '/images/industries/restaurant.png', line: 'Orders, tables, menus, shifts, and kitchen-ready workflows.' },
  { name: 'Pharmacies', image: '/images/industries/pharmacy.png', line: 'Expiry tracking, controlled stock, suppliers, and branch visibility.' },
  { name: 'Hardware', image: '/images/industries/hardware.png', line: 'Bulk sales, quotations, supplier orders, and customer accounts.' },
]

const reliability = [
  {
    icon: Sparkles,
    title: 'Seamless launch',
    text: 'Import products, invite staff, configure branches, and start selling with guided onboarding that feels calm, not technical.',
  },
  {
    icon: Headphones,
    title: 'Dependable support',
    text: 'Get help with setup, hardware, sales flows, stock controls, and reporting from people who understand daily commerce.',
  },
  {
    icon: ShieldCheck,
    title: 'Security first',
    text: 'Role permissions, audit trails, encrypted sessions, and reliable backups protect the business as the team grows.',
  },
]

const stats = [
  ['8,500+', 'businesses onboarded'],
  ['50+', 'daily workflows covered'],
  ['1,000+', 'stock and payment events synced'],
]

const setupSteps = [
  {
    icon: PackageCheck,
    title: 'Import and configure',
    text: 'Bring in products, stock counts, customer lists, suppliers, and branch settings. Pesaby keeps the setup clear so your team can start with confidence.',
  },
  { icon: UserCog, title: 'Administer user access' },
  { icon: Plug, title: 'Integrate and expand' },
  { icon: Zap, title: 'Innovate and automate' },
]

const footerLinks = {
  Product: ['Point of Sale', 'Inventory', 'Payments', 'Customers', 'Reports'],
  Company: ['Why Pesaby', 'Industries', 'Resources', 'Security', 'Contact'],
  Support: ['Getting Started', 'Training', 'Help Center', 'API Docs', 'Status'],
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#005a43] shadow-sm">
        <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-200" />
        <span className="text-xl font-black tracking-tight text-white">P</span>
      </span>
      <span className="leading-none">
        <span className="block text-lg font-black tracking-tight text-zinc-950">Pesaby</span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Business OS</span>
      </span>
    </Link>
  )
}

function ProductMockup() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="absolute -left-5 top-12 z-10 hidden w-44 rounded-xl border border-emerald-100 bg-white p-4 shadow-2xl shadow-emerald-950/15 lg:block">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <BellRing className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black text-zinc-950">Low stock</p>
            <p className="text-[11px] text-zinc-500">18 items</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-zinc-100">
          <div className="h-2 w-2/3 rounded-full bg-[#005a43]" />
        </div>
      </div>

      <div className="absolute -right-5 bottom-12 z-10 hidden w-52 rounded-xl border border-emerald-100 bg-white p-4 shadow-2xl shadow-emerald-950/15 lg:block">
        <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">Today</p>
        <p className="mt-1 text-2xl font-black tracking-tight text-[#005a43]">KES 842K</p>
        <p className="mt-1 text-[11px] font-bold text-emerald-700">+18% vs yesterday</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_35px_100px_rgba(0,54,39,0.28)]">
        <div className="flex items-center justify-between border-b border-emerald-900/20 bg-[#071f18] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Store className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-extrabold">Nairobi CBD</p>
              <p className="text-[11px] text-emerald-100/70">Live register</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-[11px] font-extrabold text-emerald-100">Synced</span>
        </div>

        <div className="grid min-h-[440px] bg-[#f6fbf8] md:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-emerald-100 bg-white p-5 md:border-b-0 md:border-r">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-extrabold text-zinc-950">Checkout</p>
              <ReceiptText className="h-4 w-4 text-[#005a43]" aria-hidden="true" />
            </div>
            {[
              ['Arabica coffee', '2 x 450', '900'],
              ['Milk 500ml', '4 x 80', '320'],
              ['Sugar 1kg', '1 x 180', '180'],
              ['Bread loaf', '3 x 70', '210'],
            ].map(([name, qty, total]) => (
              <div key={name} className="grid grid-cols-[1fr_auto] gap-3 border-b border-emerald-50 py-3 text-sm last:border-b-0">
                <div>
                  <p className="font-bold text-zinc-950">{name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{qty}</p>
                </div>
                <p className="font-extrabold text-zinc-950">{total}</p>
              </div>
            ))}
            <div className="mt-5 rounded-xl bg-[#005a43] p-4 text-white shadow-lg shadow-emerald-900/15">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-emerald-100">Total</span>
                <span className="text-2xl font-black tracking-tight">KES 1,610</span>
              </div>
              <button className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-white text-sm font-extrabold text-[#005a43]">
                Complete sale
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Revenue', '842K'],
                ['Orders', '1,284'],
                ['Margin', '31%'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-emerald-100 bg-white p-4">
                  <p className="text-[11px] font-bold text-zinc-500">{label}</p>
                  <p className="mt-1 text-xl font-black text-[#005a43]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-zinc-950">Sales momentum</p>
                  <p className="text-xs text-zinc-500">Last 12 hours</p>
                </div>
                <BarChart3 className="h-4 w-4 text-[#005a43]" aria-hidden="true" />
              </div>
              <div className="flex h-36 items-end gap-2">
                {[38, 48, 43, 62, 58, 76, 68, 88, 80, 98, 92, 110].map((height, index) => (
                  <div key={index} className="flex flex-1 items-end rounded-t bg-emerald-50" style={{ height: `${Math.max(height - 16, 25)}%` }}>
                    <div className="w-full rounded-t bg-[#005a43]" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-white p-4">
                <Truck className="h-5 w-5 text-[#005a43]" aria-hidden="true" />
                <p className="mt-3 text-sm font-extrabold text-zinc-950">Supplier reorder</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Ready for 6 fast-moving products.</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-white p-4">
                <CreditCard className="h-5 w-5 text-[#005a43]" aria-hidden="true" />
                <p className="mt-3 text-sm font-extrabold text-zinc-950">Payments matched</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Cash, card, and mobile money.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <div key={item.label} className="group relative">
                <Link href={item.href} className="inline-flex h-10 items-center gap-1 px-3 text-sm font-medium text-foreground/70 transition hover:text-foreground">
                  {item.label}
                  {item.menu ? <ChevronDown className="h-3.5 w-3.5 transition duration-200 group-hover:rotate-180" aria-hidden="true" /> : null}
                </Link>
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="hidden px-4 py-2 text-sm font-medium text-foreground/70 transition hover:text-foreground sm:inline-flex">
              Sign in
            </Link>
            <Link href="/sign-up" className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-md transition hover:bg-primary/90">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-background pt-20 pb-32 md:pt-32 md:pb-40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(94,234,212,0.1),rgba(94,234,212,0))]" aria-hidden="true" />
          
          <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-accent/50 px-4 py-2 text-xs font-bold text-accent-foreground">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                The Future of Business Operations
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                One platform for all your business needs
              </h1>
              <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                Manage point of sale, inventory, payments, customers, and analytics from a single dashboard. Built for retailers, restaurants, pharmacies, and beyond.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link href="mailto:sales@pesaby.com" className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-8 text-base font-bold transition hover:bg-accent">
                  Schedule Demo
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground">
                {['30-day free trial', 'No credit card required', '24/7 support'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Hero Image/Mockup */}
          <div className="mt-20 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="relative">
              <ProductMockup />
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="section-dark py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {stats.map(([value, label]) => (
                <div key={label} className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-white">{value}</p>
                  <p className="mt-2 text-section-dark-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-28 bg-background">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful features designed for you</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Everything you need to streamline operations, boost sales, and scale your business.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: ReceiptText, title: 'Fast Checkout', desc: 'Lightning-quick point of sale interface with support for all payment methods' },
                { icon: Layers, title: 'Inventory Management', desc: 'Real-time stock tracking with low-stock alerts and supplier integration' },
                { icon: BarChart3, title: 'Analytics & Reports', desc: 'Detailed insights into sales trends, top products, and revenue metrics' },
                { icon: UsersRound, title: 'Customer Profiles', desc: 'Build lasting relationships with purchase history and loyalty tracking' },
                { icon: Gauge, title: 'Multi-Location', desc: 'Manage multiple branches from one unified dashboard' },
                { icon: CreditCard, title: 'Payment Processing', desc: 'Accept cash, card, mobile money, and digital wallets instantly' },
              ].map((feature, idx) => (
                <div key={idx} className="fluent-card p-8 hover:shadow-lg transition">
                  <feature.icon className="h-10 w-10 text-primary mb-4" aria-hidden="true" />
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 md:py-28 bg-card border-t border-border">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Get started in minutes</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Simple setup, no complicated installations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: Clock, title: 'Create Account', desc: 'Sign up in 30 seconds' },
                { icon: PackageCheck, title: 'Setup Products', desc: 'Import your inventory' },
                { icon: UserCog, title: 'Add Staff', desc: 'Invite your team' },
                { icon: TrendingUp, title: 'Start Selling', desc: 'Begin transactions' },
              ].map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl mb-4">
                      {idx + 1}
                    </div>
                    <step.icon className="h-10 w-10 text-primary mb-4" aria-hidden="true" />
                    <h3 className="font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                  {idx < 3 && (
                    <div className="hidden md:block absolute top-7 left-[60%] w-[40%] h-0.5 bg-border" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-20 md:py-28 bg-background border-t border-border">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">Enterprise-grade security</h2>
                <p className="text-muted-foreground mb-6 text-lg">Your business data is protected with industry-leading security standards.</p>
                <ul className="space-y-4">
                  {[
                    'End-to-end encryption for all transactions',
                    'Role-based access control',
                    'Automatic daily backups',
                    'PCI-DSS compliance',
                    'GDPR ready',
                    'Audit trails for all actions'
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-full aspect-square rounded-xl bg-accent/50 flex items-center justify-center border border-border">
                  <LockKeyhole className="h-24 w-24 text-primary/50" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 md:py-28 bg-card border-t border-border">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                <span className="text-2xl font-bold">4.8/5</span>
              </div>
              <h2 className="text-4xl font-bold mb-4">Loved by business owners</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: 'Sarah Chen', role: 'Retail Store Owner', text: 'Pesaby transformed how we manage our store. Inventory tracking is a breeze now.' },
                { name: 'James Okafor', role: 'Restaurant Manager', text: 'The POS is incredibly fast and intuitive. Our staff trained in minutes, not hours.' },
                { name: 'Amelia Williams', role: 'Pharmacy Owner', text: 'Best investment we made. Real-time analytics help us make better decisions daily.' },
              ].map((testimonial, idx) => (
                <div key={idx} className="fluent-card p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">{testimonial.text}</p>
                  <p className="font-bold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-dark py-20 md:py-28">
          <div className="mx-auto max-w-4xl px-5 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to transform your business?</h2>
            <p className="text-section-dark-muted text-lg mb-8">Join thousands of businesses already using Pesaby to streamline operations and grow faster.</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-8 text-base font-bold text-section-dark-bg shadow-lg transition hover:-translate-y-0.5">
                Start Your Free Trial
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link href="mailto:sales@pesaby.com" className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-white text-white px-8 text-base font-bold transition hover:bg-white/10">
                Contact Sales
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background border-t border-border">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {Object.entries(footerLinks).map(([category, links]) => (
                <div key={category}>
                  <h3 className="font-bold mb-4">{category}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {links.map((link) => (
                      <li key={link}>
                        <Link href="#" className="hover:text-foreground transition">
                          {link}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
              <p>&copy; 2025 Pesaby. All rights reserved.</p>
              <div className="flex gap-6">
                <Link href="#" className="hover:text-foreground transition">Privacy</Link>
                <Link href="#" className="hover:text-foreground transition">Terms</Link>
                <Link href="#" className="hover:text-foreground transition">Contact</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
