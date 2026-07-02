import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  TrendingUp,
  Package,
  Users,
  Lock,
  Zap,
  Globe,
  Building2,
} from 'lucide-react'

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700">
        <span className="text-lg font-black text-white">I</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight text-foreground">Imara</span>
        <span className="text-xs font-medium text-muted-foreground">Business OS</span>
      </div>
    </Link>
  )
}

const benefits = [
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description: 'Real-time sales, inventory, and performance dashboards at a glance',
  },
  {
    icon: Package,
    title: 'Inventory Control',
    description: 'Track stock levels, set alerts, manage reorders across branches',
  },
  {
    icon: Users,
    title: 'Team Management',
    description: 'Permissions, roles, staff performance, and shift tracking',
  },
]

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built for speed. Checkout in seconds, sync instantly across branches.',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, role-based access, audit trails, and backups.',
  },
  {
    icon: Globe,
    title: 'Multi-Branch Ready',
    description: 'Manage unlimited locations from one unified dashboard.',
  },
  {
    icon: TrendingUp,
    title: 'Smart Insights',
    description: 'AI-powered recommendations for pricing, stock, and sales.',
  },
]

const industries = [
  { name: 'Retail', icon: Building2 },
  { name: 'Restaurants', icon: Building2 },
  { name: 'Pharmacies', icon: Building2 },
  { name: 'Hardware', icon: Building2 },
]

const testimonials = [
  {
    quote: 'Imara cut our inventory management time by 70%. The team loves how intuitive it is.',
    author: 'Sarah K.',
    company: 'FreshMart Kenya',
  },
  {
    quote: 'Managing 5 branches is now effortless. Real-time sync is a game-changer.',
    author: 'David M.',
    company: 'Premium Hardware',
  },
  {
    quote: 'Best POS system weve used. Support is responsive and the product keeps improving.',
    author: 'Grace O.',
    company: 'MediCare Pharmacies',
  },
]

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navigation ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo />
            <nav className="hidden items-center gap-8 lg:flex">
              <Link href="#features" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
                Features
              </Link>
              <Link href="#industries" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
                Industries
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
                Pricing
              </Link>
              <Link href="#faq" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
                FAQs
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/sign-in" className="hidden text-sm font-medium text-foreground transition hover:text-emerald-600 sm:inline-flex">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero Section ────────────────────────────────── */}
        <section className="relative overflow-hidden bg-white pb-20 pt-20 sm:pt-28 lg:pb-28 lg:pt-36">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(30deg,rgba(5,150,105,0.07)_12%,transparent_12.5%,transparent_87%,rgba(5,150,105,0.07)_87.5%)] bg-[length:120px_120px]" />

          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                <span className="text-xs font-semibold text-emerald-900">All-in-one POS and business management</span>
              </div>

              <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Run your business like a modern brand
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
                Imara brings POS, inventory, payments, customers, staff, and analytics into one clean workspace. Built for retailers, restaurants, and pharmacies that want to grow.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-7 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 shadow-sm hover:shadow-md"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="mailto:hello@imara.co.ke"
                  className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-zinc-200 px-7 py-3 text-base font-semibold text-foreground transition hover:border-emerald-200 hover:bg-emerald-50"
                >
                  Book a Demo
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
                {['30 days free', 'No card required', 'Setup in minutes'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* ─── Hero Dashboard Preview ─────────────────────── */}
            <div className="relative mt-20 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-lg lg:mt-28">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-transparent" />
              <div className="relative aspect-video bg-white/50 backdrop-blur-sm">
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-4 text-emerald-600">
                      <BarChart3 className="h-8 w-8" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">Dashboard Preview</p>
                    <p className="mt-2 text-sm text-muted-foreground">Interactive demo coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Core Benefits ──────────────────────────────── */}
        <section className="border-t border-zinc-100 bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              {benefits.map((benefit) => {
                const Icon = benefit.icon
                return (
                  <div key={benefit.title} className="group rounded-xl border border-zinc-100 bg-white p-8 transition hover:border-emerald-200 hover:bg-emerald-50/30">
                    <div className="inline-flex rounded-lg bg-emerald-100 p-3 text-emerald-600 transition group-hover:scale-110">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-lg font-bold text-foreground">{benefit.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── Features Grid ──────────────────────────────── */}
        <section id="features" className="border-t border-zinc-100 bg-zinc-50 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Powerful Features</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Everything you need to succeed</h2>
              <p className="mt-4 text-lg text-muted-foreground">Build, manage, and scale your business with confidence</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="rounded-xl border border-zinc-200 bg-white p-8 hover:shadow-md transition">
                    <div className="inline-flex rounded-lg bg-emerald-100 p-3 text-emerald-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-lg font-bold text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── Industries ─────────────────────────────────── */}
        <section id="industries" className="border-t border-zinc-100 bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Built For Everyone</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Your industry, your needs</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {industries.map((industry) => {
                const Icon = industry.icon
                return (
                  <div key={industry.name} className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-8 transition hover:border-emerald-200 hover:bg-emerald-50/30">
                    <div className="rounded-xl bg-emerald-100 p-4 text-emerald-600">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-foreground">{industry.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground text-center">Tailored solutions for your business</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ─── Testimonials ───────────────────────────────── */}
        <section className="border-t border-zinc-100 bg-zinc-50 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">What Our Users Say</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Loved by growing businesses</h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {testimonials.map((testimonial, idx) => (
                <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-8">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-amber-400">★</span>
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed italic">"{testimonial.quote}"</p>
                  <div className="mt-6 pt-6 border-t border-zinc-100">
                    <p className="font-semibold text-sm text-foreground">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing Section ────────────────────────────── */}
        <section id="pricing" className="border-t border-zinc-100 bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Transparent Pricing</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Simple, scalable plans</h2>
              <p className="mt-4 text-lg text-muted-foreground">Start free, upgrade anytime</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  name: 'Starter',
                  price: 'Free',
                  description: 'Perfect for single locations',
                  features: ['Up to 1 branch', 'Basic reporting', 'Email support', '1 user account'],
                },
                {
                  name: 'Professional',
                  price: '$49',
                  period: '/month',
                  description: 'For growing businesses',
                  features: ['Up to 5 branches', 'Advanced analytics', 'Priority support', 'Unlimited users', 'Custom branding'],
                  highlighted: true,
                },
                {
                  name: 'Enterprise',
                  price: 'Custom',
                  description: 'For large organizations',
                  features: ['Unlimited branches', 'Custom integrations', 'Dedicated support', 'Advanced security', 'Custom contracts'],
                },
              ].map((plan, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-8 transition ${
                    plan.highlighted
                      ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-lg'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

                  <button
                    className={`mt-8 w-full rounded-md py-2.5 text-sm font-semibold transition ${
                      plan.highlighted
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'border border-zinc-200 text-foreground hover:bg-zinc-50'
                    }`}
                  >
                    Get Started
                  </button>

                  <div className="mt-8 space-y-3 border-t border-zinc-100 pt-8">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-foreground">
                        <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA Section ────────────────────────────────── */}
        <section className="border-t border-zinc-100 bg-gradient-to-br from-emerald-600 to-emerald-700 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Ready to transform your business?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-100">
              Join thousands of growing businesses managing their operations with Imara. Start your free trial today.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-7 py-3 text-base font-semibold text-emerald-600 transition hover:bg-emerald-50"
              >
                Activate Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:hello@imara.co.ke"
                className="inline-flex items-center justify-center gap-2 rounded-md border-2 border-white px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Contact Sales
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-emerald-100">
              {['30 days free trial', 'No credit card required', '24/7 support'].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Footer ─────────────────────────────────────── */}
        <footer className="border-t border-zinc-100 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="grid gap-8 md:grid-cols-5 mb-8">
              <div className="md:col-span-1">
                <Logo />
                <p className="mt-4 text-sm text-muted-foreground">Business OS for modern commerce</p>
              </div>

              {[
                {
                  title: 'Product',
                  links: ['Features', 'Pricing', 'Security', 'Roadmap'],
                },
                {
                  title: 'Company',
                  links: ['About', 'Blog', 'Careers', 'Press'],
                },
                {
                  title: 'Resources',
                  links: ['Documentation', 'API', 'Help Center', 'Community'],
                },
                {
                  title: 'Legal',
                  links: ['Privacy', 'Terms', 'Cookies', 'Contact'],
                },
              ].map((column) => (
                <div key={column.title}>
                  <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {column.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-sm text-muted-foreground transition hover:text-foreground">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-100 pt-8 flex flex-col sm:flex-row items-center justify-between">
              <p className="text-sm text-muted-foreground">© 2026 Imara. All rights reserved.</p>
              <div className="mt-4 flex gap-6 sm:mt-0">
                {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
                  <a key={social} href="#" className="text-sm text-muted-foreground transition hover:text-foreground">
                    {social}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
