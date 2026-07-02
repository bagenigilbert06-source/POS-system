import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DepartmentSuite } from '@/components/landing/department-suite'
import { PlatformSuite } from '@/components/landing/platform-suite'
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
    <div className="min-h-screen bg-[#fbfaf6] font-sans text-zinc-950">
      <header className="sticky top-0 z-50 bg-white">
        <div className="border-b border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
            <Logo />
            <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary navigation">
              {navItems.map((item) => (
                <div key={item.label} className="group relative">
                  <Link href={item.href} className="inline-flex h-10 items-center gap-1 text-sm font-medium text-zinc-700 transition hover:text-emerald-800">
                    {item.label}
                    {item.menu ? <ChevronDown className="h-3.5 w-3.5 transition duration-200 group-hover:rotate-180" aria-hidden="true" /> : null}
                  </Link>
                  {item.menu ? (
                    <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 translate-y-3 rounded-xl border border-zinc-200 bg-white p-2 opacity-0 shadow-[0_20px_60px_rgba(24,24,27,0.14)] transition-all duration-200 group-hover:visible group-hover:translate-y-1 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-1 group-focus-within:opacity-100">
                      <div className="absolute -top-3 left-0 h-3 w-full" />
                      {item.menu.map((entry) => (
                        <Link
                          key={entry}
                          href={item.href}
                          className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-[#f4efe4] hover:text-zinc-950"
                        >
                          {entry}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className="hidden px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:text-zinc-950 sm:inline-flex">
                Sign in
              </Link>
              <Link href="/sign-up" className="inline-flex h-10 items-center justify-center rounded-md bg-[#d92534] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#bd1e2b]">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,#f3f8ef_0%,#ffffff_100%)]" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#d1fae5] bg-[#ecfdf5] px-3.5 py-1.5 text-xs font-semibold text-[#065f46]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                All-in-one POS and business management
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl">
                Sell smarter. Track stock faster. Run your business from one place.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-6 text-zinc-600 sm:text-lg sm:leading-7">
                Pesaby is a modern operating system built for retailers, restaurants, pharmacies, and wholesalers. Manage checkout, inventory, payments, customers, branches, and reporting—all from one clean workspace.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/sign-up" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1a5c38] px-6 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#154d30]">
                  Activate free trial
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="mailto:hello@pesaby.com" className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50">
                  Contact sales
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-zinc-600">
                {['Free for 30 days', 'No card required', 'Free support included'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#1a5c38]" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden bg-[#005a43] pb-14 pt-14 lg:pb-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" aria-hidden="true" />
            <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
              <div className="relative">
                <ProductMockup />
              </div>
            </div>
          </div>
        </section>

        <section id="customers" className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-5 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 text-sm text-zinc-950">
              <Star className="h-4 w-4 fill-[#f5a400] text-[#f5a400]" aria-hidden="true" />
              <span className="font-bold">4.8/5</span>
              <span className="text-zinc-600">based on growing business feedback</span>
            </div>
            <div className="mx-auto mt-10 grid max-w-4xl border-y border-zinc-200 md:grid-cols-3">
              {stats.map(([value, label]) => (
                <div key={label} className="border-b border-zinc-200 px-6 py-6 md:border-b-0 md:border-r md:last:border-r-0">
                  <p className="text-3xl font-bold tracking-tight text-zinc-950">{value}</p>
                  <p className="mt-2 text-sm font-medium text-zinc-600">{label}</p>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-zinc-400">
              {['RetailCo', 'FreshMart', 'MedPlus', 'Hardware Hub', 'Table House', 'BeautyPro'].map((logo) => (
                <span key={logo}>{logo}</span>
              ))}
            </div>
          </div>
        </section>

        <DepartmentSuite />

        <PlatformSuite />

        <section id="concierge" className="bg-white py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight text-zinc-950 sm:text-4xl">
              Launch with confidence. Get expert support every step.
            </h2>
            <div className="mt-14 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="border-b-2 border-zinc-950 bg-[#f5f0e4] p-6">
                  <div className="flex items-start gap-3">
                    <PackageCheck className="mt-1 h-5 w-5 text-zinc-950 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <h3 className="text-lg font-bold text-zinc-950">{setupSteps[0].title}</h3>
                      <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-950">{setupSteps[0].text}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6 px-8 py-8">
                  {setupSteps.slice(1).map((step) => {
                    const Icon = step.icon
                    return (
                      <div key={step.title} className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-zinc-950 flex-shrink-0" aria-hidden="true" />
                        <h3 className="text-lg font-bold text-zinc-950">{step.title}</h3>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-[480px] overflow-hidden rounded-lg bg-[#f6f0df]">
                <div className="absolute inset-0 bg-[linear-gradient(30deg,rgba(0,0,0,0.05)_12%,transparent_12.5%,transparent_87%,rgba(0,0,0,0.05)_87.5%,rgba(0,0,0,0.05)),linear-gradient(150deg,rgba(0,0,0,0.05)_12%,transparent_12.5%,transparent_87%,rgba(0,0,0,0.05)_87.5%,rgba(0,0,0,0.05))] bg-[length:82px_142px]" aria-hidden="true" />
                <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-[#005a43] shadow-[0_0_60px_rgba(0,90,67,0.28)]">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-4xl font-black text-[#005a43] shadow-sm">
                    P
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

        <section id="features" className="bg-[#fbfaf6] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-800">Reliable All-In-One Solution</p>
              <h2 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
                The tools growing businesses usually buy separately, finally working together.
              </h2>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {reliability.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title}>
                    <div className="flex aspect-[1.55] items-center justify-center rounded-lg bg-[#005a43] text-white">
                      <Icon className="h-16 w-16 text-emerald-100" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-2xl font-black tracking-tight text-zinc-950">{item.title}</h3>
                    <p className="mt-4 text-base leading-7 text-zinc-700">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="industries" className="bg-white py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-800">Industries</p>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">Made for businesses that move products and serve customers every day.</h2>
              </div>
              <Link href="/industries" className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 hover:text-emerald-950">
                Explore industries
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {industryCards.map((industry) => (
                <Link key={industry.name} href="/industries" className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-950/10">
                  <div className="relative aspect-[1.2] overflow-hidden bg-zinc-100">
                    <Image
                      src={industry.image}
                      alt={industry.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-black text-zinc-950">{industry.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{industry.line}</p>
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
