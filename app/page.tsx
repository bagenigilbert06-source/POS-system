import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DepartmentSuite } from '@/components/landing/department-suite'
import { PlatformSuite } from '@/components/landing/platform-suite'
import { HeroCarousel } from '@/components/landing/hero-carousel'
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
  TrendingUp,
  UserCog,
  UsersRound,
  WalletCards,
  Zap,
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
    <Link href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
      <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/30">
        <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-blue-300 opacity-60" />
        <span className="text-2xl font-black tracking-tight text-white">P</span>
      </span>
      <span className="leading-none">
        <span className="block text-lg font-black tracking-tight text-slate-950">Pesaby</span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Business OS</span>
      </span>
    </Link>
  )
}

function ProductMockup() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="absolute -left-6 top-16 z-10 hidden w-48 rounded-xl border border-blue-300 bg-white p-4 shadow-2xl lg:block">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-100 text-blue-600">
            <BellRing className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black text-slate-950">Low stock alert</p>
            <p className="text-[11px] text-slate-500">18 items</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-2 w-2/3 rounded-full bg-blue-600" />
        </div>
      </div>

      <div className="absolute -right-6 bottom-16 z-10 hidden w-52 rounded-xl border border-blue-300 bg-white p-4 shadow-2xl lg:block">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Today Sales</p>
        <p className="mt-1 text-2xl font-black tracking-tight text-blue-600">KES 842K</p>
        <p className="mt-1 text-[11px] font-bold text-green-600">+18% vs yesterday</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_40px_120px_rgba(37,99,235,0.15)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
              <Store className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-extrabold">Nairobi CBD</p>
              <p className="text-[11px] text-blue-200">Live register</p>
            </div>
          </div>
          <span className="rounded-full bg-blue-400/20 px-3 py-1 text-[11px] font-extrabold text-blue-100">Synced</span>
        </div>

        <div className="grid min-h-[440px] bg-gradient-to-br from-slate-50 to-blue-50 md:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-slate-200 bg-white p-5 md:border-b-0 md:border-r">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-950">Checkout</p>
              <ReceiptText className="h-4 w-4 text-blue-600" aria-hidden="true" />
            </div>
            {[
              ['Arabica coffee', '2 x 450', '900'],
              ['Milk 500ml', '4 x 80', '320'],
              ['Sugar 1kg', '1 x 180', '180'],
              ['Bread loaf', '3 x 70', '210'],
            ].map(([name, qty, total]) => (
              <div key={name} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 py-3 text-sm last:border-b-0">
                <div>
                  <p className="font-bold text-slate-950">{name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{qty}</p>
                </div>
                <p className="font-extrabold text-slate-950">{total}</p>
              </div>
            ))}
            <div className="mt-5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-blue-100">Total</span>
                <span className="text-2xl font-black tracking-tight">KES 1,610</span>
              </div>
              <button className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-white text-sm font-extrabold text-blue-600 hover:bg-blue-50 transition">
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
                <div key={label} className="rounded-xl border border-blue-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition">
                  <p className="text-[11px] font-bold text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-black text-blue-600">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-blue-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-slate-950">Sales momentum</p>
                  <p className="text-xs text-slate-500">Last 12 hours</p>
                </div>
                <BarChart3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex h-36 items-end gap-2">
                {[38, 48, 43, 62, 58, 76, 68, 88, 80, 98, 92, 110].map((height, index) => (
                  <div key={index} className="flex flex-1 items-end rounded-t bg-blue-100" style={{ height: `${Math.max(height - 16, 25)}%` }}>
                    <div className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-500" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition">
                <Truck className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-extrabold text-slate-950">Supplier reorder</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Ready for 6 fast-moving products.</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition">
                <CreditCard className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-extrabold text-slate-950">Payments matched</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Cash, card, and mobile money.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans text-slate-950">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <div key={item.label} className="group relative">
                <Link href={item.href} className="inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-slate-700 transition hover:text-blue-600">
                  {item.label}
                  {item.menu ? <ChevronDown className="h-4 w-4 transition duration-200 group-hover:rotate-180" aria-hidden="true" /> : null}
                </Link>
                {item.menu ? (
                  <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-4 rounded-xl border border-slate-100 bg-white p-2 opacity-0 shadow-[0_20px_60px_rgba(15,23,42,0.12)] transition-all duration-200 group-hover:visible group-hover:translate-y-2 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-2 group-focus-within:opacity-100">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-4 w-full" />
                    {item.menu.map((entry) => (
                      <Link
                        key={entry}
                        href={item.href}
                        className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        {entry}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="hidden px-4 py-2 text-sm font-semibold text-slate-700 transition hover:text-blue-600 sm:inline-flex">
              Sign in
            </Link>
            <Link href="/sign-up" className="inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-700/40">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <HeroCarousel />

        <section id="customers" className="bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden="true" />
                  ))}
                </div>
                <span className="text-lg font-bold text-slate-900">4.8/5</span>
                <span className="text-slate-600">from trusted businesses</span>
              </div>
              <div className="mx-auto max-w-5xl grid md:grid-cols-3 gap-8">
                {stats.map(([value, label]) => (
                  <div key={label} className="flex flex-col items-center">
                    <p className="text-5xl lg:text-6xl font-black text-slate-900">{value}</p>
                    <p className="mt-3 text-base font-semibold text-slate-600">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-20 pt-16 border-t border-slate-200">
              <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-500 mb-8">Trusted by thousands</p>
              <div className="flex flex-wrap items-center justify-center gap-12 text-slate-400 font-bold text-lg">
                {['RetailCo', 'FreshMart', 'MedPlus', 'Hardware Hub', 'Table House', 'BeautyPro'].map((logo) => (
                  <span key={logo} className="hover:text-slate-600 transition">{logo}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <DepartmentSuite />

        <PlatformSuite />

        <section id="concierge" className="bg-gradient-to-b from-white to-blue-50/50 py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <h2 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl mb-4">
              Get started in minutes.
            </h2>
            <p className="max-w-2xl text-xl text-slate-600 mb-16">
              No lengthy setup. Our guided onboarding gets you selling in minutes.
            </p>
            <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-stretch">
              <div>
                <div className="border-l-4 border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100/50 p-8 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white flex-shrink-0">
                      <PackageCheck className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-950">{setupSteps[0].title}</h3>
                      <p className="mt-3 max-w-lg text-base leading-7 text-slate-700">{setupSteps[0].text}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6 mt-6 pl-6 border-l-2 border-slate-200">
                  {setupSteps.slice(1).map((step, idx) => {
                    const Icon = step.icon
                    return (
                      <div key={step.title} className="flex items-start gap-4 relative">
                        <div className="absolute -left-8 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-white border-2 border-blue-600 text-blue-600 font-bold flex-shrink-0">
                          {idx + 2}
                        </div>
                        <div className="pt-1">
                          <h3 className="text-xl font-black text-slate-950">{step.title}</h3>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 p-8 shadow-2xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.2),transparent_40%)]" aria-hidden="true" />
                <div className="absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl opacity-20 blur-2xl" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-2xl">
                    <span className="text-5xl font-black text-blue-600">P</span>
                  </div>
                </div>
                {[
                  ['top-[22%] left-[20%]', ReceiptText],
                  ['top-[22%] right-[20%]', Plug],
                  ['top-1/2 left-[14%]', WalletCards],
                  ['top-1/2 right-[14%]', UsersRound],
                  ['bottom-[18%] left-[28%]', BarChart3],
                  ['bottom-[18%] right-[28%]', ShieldCheck],
                ].map(([pos, Icon], index) => (
                  <div key={index} className={`absolute ${pos as string} flex h-16 w-16 -translate-y-1/2 items-center justify-center border border-orange-300 bg-white/60 text-emerald-700`}>
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <p className="text-sm font-black uppercase tracking-widest text-blue-600 mb-4">Why Choose Pesaby</p>
              <h2 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
                Everything your business needs in one place.
              </h2>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {reliability.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 hover:border-blue-200 hover:shadow-lg transition duration-300">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600">
                      <Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950">{item.title}</h3>
                    <p className="mt-4 text-base leading-7 text-slate-600">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="industries" className="bg-gradient-to-b from-blue-50/50 to-white py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-16">
              <div className="max-w-2xl">
                <p className="text-sm font-black uppercase tracking-widest text-blue-600 mb-4">Solutions</p>
                <h2 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">Built for every type of business.</h2>
              </div>
              <Link href="/industries" className="inline-flex items-center gap-2 text-base font-bold text-blue-600 hover:text-blue-700 group">
                Explore all
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {industryCards.map((industry) => (
                <Link key={industry.name} href="/industries" className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:border-blue-300">
                  <div className="relative aspect-[1.2] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                    <Image
                      src={industry.image}
                      alt={industry.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-black text-slate-950">{industry.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{industry.line}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-[#f4efe4] py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#005a43]">Simple pricing</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">
                Start lean. Add power as your business grows.
              </h2>
            </div>

            <div className="mx-auto mt-12 grid max-w-6xl overflow-hidden rounded-xl bg-[#005a43] text-white shadow-[0_24px_80px_rgba(0,90,67,0.22)] lg:grid-cols-[1.15fr_0.85fr]">
              <div className="p-8 sm:p-10 lg:p-12">
                <h3 className="text-2xl font-extrabold">Business-ready POS plan</h3>
                <div className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                  {[
                    'Point of sale and receipt workflows',
                    'Inventory, suppliers, and reorder alerts',
                    'Payments, refunds, and daily reconciliation',
                    'Customers, staff roles, and branch controls',
                    'Reports for sales, margins, and stock movement',
                    'Guided setup with support and training',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm font-semibold text-emerald-50">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-200" aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 flex flex-wrap gap-6 text-sm font-extrabold uppercase">
                  <Link href="/sign-up" className="text-emerald-100 underline decoration-emerald-200 underline-offset-4 hover:text-white">
                    View plan details
                  </Link>
                  <Link href="mailto:hello@pesaby.com" className="text-emerald-100 underline decoration-emerald-200 underline-offset-4 hover:text-white">
                    View pricing FAQs
                  </Link>
                </div>
              </div>

              <div className="border-t border-white/10 bg-[#004735] p-8 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">From</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-2xl font-black text-emerald-100">KES</span>
                  <span className="text-6xl font-black tracking-tight text-white">3,330</span>
                </div>
                <p className="mt-5 text-sm leading-6 text-emerald-50">
                  per workspace/month, billed annually. Add registers, branches, and advanced controls when your team needs them.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <Link href="/sign-up" className="inline-flex h-12 items-center justify-center rounded-md bg-[#d92534] px-7 text-sm font-extrabold text-white transition hover:bg-[#bd1e2b]">
                    Create workspace
                  </Link>
                  <Link href="mailto:hello@pesaby.com" className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 px-7 text-sm font-extrabold text-white transition hover:bg-white/10">
                    Book demo
                  </Link>
                </div>
                <p className="mt-6 text-xs leading-5 text-emerald-100/80">
                  Local taxes and payment processing fees may apply depending on your setup.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="resources" className="bg-white py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-6 lg:grid-cols-3 lg:px-8">
            {[
              { icon: LockKeyhole, title: 'Permissions', text: 'Control what cashiers, managers, accountants, and owners can see or change.' },
              { icon: BellRing, title: 'Smart alerts', text: 'Know when stock is low, payments need review, or performance changes unexpectedly.' },
              { icon: WalletCards, title: 'Clean records', text: 'Keep every sale, payment, refund, and stock movement connected to the right day.' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-lg border border-zinc-200 bg-[#fbfaf6] p-7">
                  <Icon className="h-7 w-7 text-emerald-800" aria-hidden="true" />
                  <h3 className="mt-5 text-xl font-black text-zinc-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">{item.text}</p>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="bg-[#202322] text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-6 border-b border-white/10 pb-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#005a43]">
                <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-emerald-200" />
                <span className="text-2xl font-black">P</span>
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight">Pesaby</p>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Business OS for modern commerce</p>
              </div>
            </div>
            <p className="max-w-xl text-sm leading-6 text-zinc-300">
              Run sales, inventory, payments, customers, and daily operations from one calm workspace built for growing businesses.
            </p>
          </div>
          <div className="grid gap-12 lg:grid-cols-[360px_1fr]">
            <div className="grid gap-6">
              <div className="bg-[#eef7f2] p-7 text-zinc-950">
                <Sparkles className="h-7 w-7 text-[#005a43]" aria-hidden="true" />
                <h3 className="mt-7 text-2xl font-extrabold">Implementation clinic</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-700">Plan products, users, branches, payments, and reports with a Pesaby specialist.</p>
                <Link href="mailto:hello@pesaby.com" className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#005a43] px-5 text-sm font-bold text-white">
                  Book a session
                </Link>
              </div>
              <div className="bg-[#d7efe4] p-7 text-zinc-950">
                <Headphones className="h-7 w-7 text-[#005a43]" aria-hidden="true" />
                <h3 className="mt-7 text-2xl font-extrabold">Live product demos</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-700">See POS, inventory, payments, and branch reporting using realistic business workflows.</p>
                <Link href="mailto:hello@pesaby.com" className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#d92534] px-5 text-sm font-bold text-white">
                  Reserve a demo
                </Link>
              </div>
            </div>

            <div>
              <div className="grid gap-10 sm:grid-cols-3">
                {Object.entries(footerLinks).map(([title, links]) => (
                  <div key={title}>
                    <h3 className="text-xl font-extrabold">{title}</h3>
                    <ul className="mt-5 space-y-3">
                      {links.map((link) => (
                        <li key={link}>
                          <Link href="#resources" className="text-sm text-zinc-300 transition hover:text-white hover:underline">
                            {link}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-12 border-y border-white/10 py-7">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <a href="mailto:support@pesaby.com" className="inline-flex items-center gap-3 text-base font-bold underline">
                    <Mail className="h-5 w-5" aria-hidden="true" />
                    support@pesaby.com
                  </a>
                  <div className="flex gap-3">
                    {['X', 'in', 'yt', 'ig'].map((item) => (
                      <span key={item} className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-zinc-200">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
                <label className="relative block flex-1">
                  <span className="sr-only">Search resources</span>
                  <input
                    className="h-11 w-full rounded-md border border-white/10 bg-white px-4 pr-11 text-sm text-zinc-950 outline-none placeholder:text-zinc-500"
                    placeholder="Search product guides, FAQs, and setup resources..."
                  />
                  <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                </label>
                <button className="h-11 rounded-md bg-white/10 px-5 text-sm font-bold text-white">English</button>
              </div>
            </div>
          </div>

          <div className="mt-11 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-zinc-400 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Pesaby Technologies Ltd. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              {['Contact Us', 'Security', 'Compliance', 'Terms of Service', 'Privacy Policy', 'Refund Policy', 'Cookie Policy', 'Status'].map((item) => (
                <Link key={item} href="#" className="hover:text-zinc-200">
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
