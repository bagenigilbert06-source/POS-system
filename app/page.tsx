import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { DepartmentSuite } from '@/components/landing/department-suite';
import { PlatformSuite } from '@/components/landing/platform-suite';
import { HeroCarousel } from '@/components/landing/hero-carousel';
import { PesabyLogoMark } from '@/components/brand/pesaby-logo';
import {
  IconArrowRight as ArrowRight,
  IconChartBar as BarChart3,
  IconBellRinging as BellRing,
  IconCheck as Check,
  IconChevronDown as ChevronDown,
  IconCreditCard as CreditCard,
  IconHeadphones as Headphones,
  IconLock as LockKeyhole,
  IconMail as Mail,
  IconMenu2 as Menu,
  IconPackage as PackageCheck,
  IconPlug as Plug,
  IconReceipt as ReceiptText,
  IconSearch as Search,
  IconShieldCheck as ShieldCheck,
  IconSparkles as Sparkles,
  IconBuildingStore as Store,
  IconTruck as Truck,
  IconTrendingUp as TrendingUp,
  IconUserCog as UserCog,
  IconUsers as UsersRound,
  IconBolt as Zap,
} from '@tabler/icons-react';

const navItems = [
  {
    label: 'Product',
    href: '#features',
    menu: ['Business overview', 'Sales and payments', 'Inventory', 'Reporting'],
  },
  {
    label: 'Solutions',
    href: '#platform',
    menu: ['Daily operations', 'Team management', 'Multi-branch control', 'Finance'],
  },
  {
    label: 'Industries',
    href: '#industries',
    menu: ['Retail', 'Restaurants', 'Pharmacies', 'Hardware'],
  },
  { label: 'Pricing', href: '#pricing' },
  {
    label: 'Resources',
    href: '/resources',
    menu: ['Guides', 'Training', 'Help center', 'Contact'],
  },
];

const industryCards = [
  {
    name: 'Retail',
    image: '/images/industries/retail.png',
    line: 'Fast counters, stock alerts, loyalty, and daily sales reports.',
  },
  {
    name: 'Restaurants',
    image: '/images/industries/restaurant.png',
    line: 'Orders, tables, menus, shifts, and kitchen-ready workflows.',
  },
  {
    name: 'Pharmacies',
    image: '/images/industries/pharmacy.png',
    line: 'Expiry tracking, controlled stock, suppliers, and branch visibility.',
  },
  {
    name: 'Hardware',
    image: '/images/industries/hardware.png',
    line: 'Bulk sales, quotations, supplier orders, and customer accounts.',
  },
  {
    name: 'Salons & Wellness',
    image: '/images/industries/salon.png',
    line: 'Appointments, service sales, staff schedules, and client history.',
  },
  {
    name: 'Wholesale & Distribution',
    image: '/images/industries/wholesale.png',
    line: 'Bulk pricing, purchasing, deliveries, and multi-warehouse control.',
  },
  {
    name: 'Convenience Stores',
    image: '/images/industries/retail.png',
    line: 'Quick checkout, replenishment alerts, and simple daily reporting.',
  },
  {
    name: 'Catering & Events',
    image: '/images/industries/restaurant.png',
    line: 'Pre-orders, event menus, deposits, and coordinated service teams.',
  },
];

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
];

const setupSteps = [
  {
    icon: PackageCheck,
    title: 'Import and configure',
    text: 'Bring in products, stock counts, customer lists, suppliers, and branch settings. Pesaby keeps the setup clear so your team can start with confidence.',
  },
  { icon: UserCog, title: 'Administer user access' },
  { icon: Plug, title: 'Integrate and expand' },
  { icon: Zap, title: 'Innovate and automate' },
];

const footerLinks = {
  Product: ['Point of Sale', 'Inventory', 'Payments', 'Customers', 'Reports'],
  Company: ['Why Pesaby', 'Industries', 'Resources', 'Security', 'Contact'],
  Support: ['Getting Started', 'Training', 'Help Center', 'API Docs', 'Status'],
};

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ffda32] shadow-lg shadow-black/15" aria-hidden="true">
        <PesabyLogoMark className="h-10 w-10" />
      </span>
      <span className="leading-none">
        <span className="block text-lg font-black tracking-tight text-slate-950">
          Pesaby
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Business OS
        </span>
      </span>
    </Link>
  );
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
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Today Sales
        </p>
        <p className="mt-1 text-2xl font-black tracking-tight text-blue-600">
          KES 842K
        </p>
        <p className="mt-1 text-[11px] font-bold text-green-600">
          +18% vs yesterday
        </p>
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
          <span className="rounded-full bg-blue-400/20 px-3 py-1 text-[11px] font-extrabold text-blue-100">
            Synced
          </span>
        </div>

        <div className="grid min-h-[440px] bg-gradient-to-br from-slate-50 to-blue-50 md:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-slate-200 bg-white p-5 md:border-b-0 md:border-r">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-extrabold text-slate-950">Checkout</p>
              <ReceiptText
                className="h-4 w-4 text-blue-600"
                aria-hidden="true"
              />
            </div>
            {[
              ['Arabica coffee', '2 x 450', '900'],
              ['Milk 500ml', '4 x 80', '320'],
              ['Sugar 1kg', '1 x 180', '180'],
              ['Bread loaf', '3 x 70', '210'],
            ].map(([name, qty, total]) => (
              <div
                key={name}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 py-3 text-sm last:border-b-0"
              >
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
                <span className="text-2xl font-black tracking-tight">
                  KES 1,610
                </span>
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
                <div
                  key={label}
                  className="rounded-xl border border-blue-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition"
                >
                  <p className="text-[11px] font-bold text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-black text-blue-600">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-blue-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-slate-950">
                    Sales momentum
                  </p>
                  <p className="text-xs text-slate-500">Last 12 hours</p>
                </div>
                <BarChart3
                  className="h-4 w-4 text-blue-600"
                  aria-hidden="true"
                />
              </div>
              <div className="flex h-36 items-end gap-2">
                {[38, 48, 43, 62, 58, 76, 68, 88, 80, 98, 92, 110].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex flex-1 items-end rounded-t bg-blue-100"
                      style={{ height: `${Math.max(height - 16, 25)}%` }}
                    >
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-500"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition">
                <Truck className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-extrabold text-slate-950">
                  Supplier reorder
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Ready for 6 fast-moving products.
                </p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition">
                <CreditCard
                  className="h-5 w-5 text-blue-600"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-extrabold text-slate-950">
                  Payments matched
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Cash, card, and mobile money.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect('/dashboard');

  return (
    <div className="min-h-screen overflow-x-clip bg-white font-sans text-slate-950">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:h-[4.5rem] lg:px-8">
          <Logo />
          <nav
            className="hidden items-center gap-1 xl:flex"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => (
              <div key={item.label} className="group relative">
                <Link
                  href={item.href}
                  className="inline-flex h-10 items-center gap-1 rounded-lg px-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-[#fff6cc] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
                >
                  {item.label}
                  {item.menu ? (
                    <ChevronDown
                      className="h-4 w-4 transition duration-200 group-hover:rotate-180"
                      aria-hidden="true"
                    />
                  ) : null}
                </Link>
                {item.menu ? (
                  <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-4 rounded-xl border border-slate-100 bg-white p-2 opacity-0 shadow-[0_20px_60px_rgba(15,23,42,0.12)] transition-all duration-200 group-hover:visible group-hover:translate-y-2 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-2 group-focus-within:opacity-100">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-4 w-full" />
                    {item.menu.map((entry) => (
                      <Link
                        key={entry}
                        href={item.href}
                        className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-[#fff6cc] hover:text-slate-950"
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
            <Link
              href="/sign-in"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#fff6cc] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] lg:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-10 items-center justify-center rounded bg-[#e42527] px-5 text-sm font-bold text-white shadow-md shadow-red-900/15 transition hover:bg-[#c91f21] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2"
            >
              Start Free Trial
            </Link>
            <details className="group relative xl:hidden">
              <summary
                className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-[#fff6cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </summary>
              <nav
                className="absolute right-0 top-12 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.14)]"
                aria-label="Mobile navigation"
              >
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-[#fff6cc] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/sign-in"
                  className="mt-2 block rounded-lg border-t border-slate-100 px-3 py-3 text-sm font-semibold text-slate-700 lg:hidden"
                >
                  Sign in
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main id="main-content">
        <HeroCarousel />

        <DepartmentSuite />

        <PlatformSuite />


        <section
          id="reliability"
          className="scroll-mt-20 bg-white py-16 sm:py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <p className="mb-4 text-sm font-black uppercase tracking-widest text-[#e42527]">
                Why teams choose Pesaby
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                A reliable operating foundation for everyday business.
              </h2>
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {reliability.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="overflow-hidden border border-slate-200 bg-white sm:p-0"
                  >
                    <div className="flex h-40 items-center justify-center bg-[#fff6cc] text-slate-950">
                      <Icon className="h-16 w-16" strokeWidth={1.25} aria-hidden="true" />
                    </div>
                    <div className="p-7 sm:p-8"><h3 className="text-2xl font-black tracking-tight text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-base leading-7 text-slate-600">
                      {item.text}
                    </p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="industries"
          className="scroll-mt-20 border-y border-slate-200 bg-white py-16 sm:py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="mb-4 text-sm font-black uppercase tracking-widest text-[#e42527]">
                  Solutions
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Built for every type of business.
                </h2>
              </div>
              <a
                href="/industries"
                className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#e42527] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffda32] focus-visible:ring-offset-4"
              >
                View all industries <span aria-hidden="true">→</span>
              </a>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {industryCards.map((industry) => (
                <article
                  key={industry.name}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-transform duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg"
                >
                  <div className="relative aspect-[1.2] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                    <Image
                      src={industry.image}
                      alt={industry.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-black text-slate-950">
                      {industry.name}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {industry.line}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-20 border-y border-slate-200 bg-[#fff4e8] py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#e42527]">
                Simple pricing
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                Start lean. Add power as your business grows.
              </h2>
            </div>

            <div className="mx-auto mt-12 grid max-w-6xl overflow-hidden rounded-lg border border-black/10 bg-white text-slate-950 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.35)] lg:grid-cols-[1.15fr_0.85fr]">
              <div className="p-8 sm:p-10 lg:p-12">
                <h3 className="text-2xl font-extrabold text-slate-950">
                  Business-ready operating system
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  Start with the core workflows and add more operational control as your team and branch network grows.
                </p>
                <div className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
                  {[
                    'Sales, point of sale, and receipts',
                    'Inventory, suppliers, and reorder alerts',
                    'Payments, expenses, and reconciliation',
                    'Customers, staff roles, and branch controls',
                    'Reports for sales, margins, and stock movement',
                    'Guided setup with support and training',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 text-sm font-semibold text-slate-700"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 flex flex-wrap gap-6 text-sm font-extrabold uppercase">
                  <Link
                    href="/sign-up"
                    className="text-[#e42527] underline decoration-red-300 underline-offset-4 hover:text-[#c91f21]"
                  >
                    View plan details
                  </Link>
                  <Link
                    href="mailto:hello@pesaby.com"
                    className="text-[#e42527] underline decoration-red-300 underline-offset-4 hover:text-[#c91f21]"
                  >
                    View pricing FAQs
                  </Link>
                </div>
              </div>

              <div className="border-t border-black/10 bg-[#ffda32] p-8 text-slate-950 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-700">
                  From
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-800">
                    KES
                  </span>
                  <span className="text-5xl font-bold tracking-tight text-slate-950">
                    3,330
                  </span>
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-700">
                  per workspace/month, billed annually. Add registers, branches,
                  and advanced controls when your team needs them.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <Link
                    href="/sign-up"
                    className="inline-flex h-12 items-center justify-center rounded bg-[#e42527] px-7 text-sm font-extrabold text-white shadow-lg shadow-red-900/15 transition hover:bg-[#c91f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
                  >
                    Create workspace
                  </Link>
                  <Link
                    href="mailto:hello@pesaby.com"
                    className="inline-flex h-12 items-center justify-center rounded border border-slate-950 px-7 text-sm font-extrabold text-slate-950 transition hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                  >
                    Book demo
                  </Link>
                </div>
                <p className="mt-6 text-xs leading-5 text-slate-600">
                  Local taxes and payment processing fees may apply depending on
                  your setup.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="bg-[#232323] text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-6 border-b border-white/10 pb-10 md:flex-row md:items-end md:justify-between">
            <div className="flex items-center gap-4"><PesabyLogoMark className="h-12 w-12" /><div><p className="text-2xl font-bold text-white">Pesaby</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffda32]">Business OS for modern commerce</p></div></div>
            <p className="max-w-xl text-sm leading-6 text-zinc-300">One connected workspace for sales, inventory, expenses, customers, staff, branches, and reporting.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="flex min-h-64 flex-col bg-[#f7f1e5] p-7 text-slate-950 sm:p-8">
                <div className="flex items-start justify-between"><Sparkles className="h-7 w-7 text-[#e42527]" aria-hidden="true" /><span className="text-sm font-black">Pesaby</span></div>
                <h2 className="mt-7 text-2xl font-bold text-slate-950">Implementation workshops</h2>
                <p className="mt-3 text-sm leading-6 text-slate-700">Plan products, branches, staff access, payments, and reports with a Pesaby specialist.</p>
                <a href="mailto:hello@pesaby.com?subject=Pesaby%20implementation" className="mt-auto inline-flex h-10 w-fit items-center bg-[#e42527] px-5 text-sm font-bold uppercase text-white hover:bg-[#c91f21]">Learn more</a>
              </div>
              <div className="flex min-h-64 flex-col bg-[#ffda32] p-7 text-slate-950 sm:p-8">
                <div className="flex items-start justify-between"><Headphones className="h-7 w-7 text-slate-950" aria-hidden="true" /><span className="text-sm font-black">Pesaby</span></div>
                <h2 className="mt-7 text-2xl font-bold text-slate-950">Live product demos</h2>
                <p className="mt-3 text-sm leading-6 text-slate-800">See how sales, inventory, expenses, customers, staff, and reporting work together.</p>
                <a href="mailto:hello@pesaby.com?subject=Pesaby%20product%20demo" className="mt-auto inline-flex h-10 w-fit items-center bg-[#e42527] px-5 text-sm font-bold uppercase text-white hover:bg-[#c91f21]">Save your seat</a>
              </div>
          </div>

            <div className="mt-12 grid gap-10 border-t border-white/10 pt-10 sm:grid-cols-3">
              {[
                ['Quick links', ['Getting Started', 'Product Guides', 'Training', 'Pricing FAQs', 'Help Center', 'Contact']],
                ['Explore Pesaby', ['Business Operating System', 'Sales and Payments', 'Inventory Management', 'Expense Tracking', 'Multi-Branch Operations', 'Reports and Analytics']],
                ['Business support', ['Implementation', 'Data Migration', 'Hardware Setup', 'Staff Training', 'Security', 'System Status']],
              ].map(([title, links]) => (
                <div key={title as string}>
                  <h2 className="text-xl font-bold text-white">{title as string}</h2>
                  <ul className="mt-5 space-y-3">{(links as readonly string[]).map(link => <li key={link}><Link href="/resources" className="text-sm text-zinc-300 transition hover:text-white hover:underline">{link}</Link></li>)}</ul>
                </div>
              ))}
          </div>

          <div className="mt-12 grid gap-8 border-y border-white/10 py-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div><a href="mailto:support@pesaby.com" className="inline-flex items-center gap-3 text-base font-bold text-white underline decoration-white/50 underline-offset-4"><Mail className="h-5 w-5" aria-hidden="true" />support@pesaby.com</a><div className="mt-4 flex gap-3" aria-label="Social channels"><a href="#" aria-label="X / Twitter" className="flex h-9 w-9 items-center justify-center text-lg font-bold text-white transition-colors hover:text-[#1d9bf0]">𝕏</a><a href="#" aria-label="LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-sm text-lg font-bold text-[#0a66c2] transition-colors hover:text-[#58a6e8]">in</a><a href="#" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center text-lg font-bold text-[#ff0000] transition-colors hover:text-[#ff5a5a]">▶</a><a href="#" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center text-lg font-bold text-[#e1306c] transition-colors hover:text-[#f77737]">◎</a></div></div>
            <form action="/resources" method="get" className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1"><span className="sr-only">Search resources</span><input name="q" className="h-11 w-full border-0 bg-white px-4 pr-12 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-[#ffda32]" placeholder="Search product overviews, FAQs, and more..." /><button type="submit" aria-label="Search resources" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffda32]"><Search className="h-5 w-5" aria-hidden="true" /></button></label>
              <div className="flex h-11 items-center justify-center bg-[#4a4a4a] px-6 text-sm font-semibold text-white">English</div>
            </form>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-zinc-400 md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Pesaby Technologies Ltd. All rights reserved.</p>
            <div className="flex flex-wrap gap-4"><a href="mailto:hello@pesaby.com" className="hover:text-white">Contact</a>{['Security', 'Terms', 'Privacy', 'Status'].map(item => <span key={item}>{item}</span>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
