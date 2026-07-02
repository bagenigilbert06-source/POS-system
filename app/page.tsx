'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Menu,
  X,
  ArrowRight,
  BarChart3,
  ShieldCheck,
  Zap,
  CheckCircle2,
  TrendingUp,
  Users,
  Lock,
  Smartphone,
  Wind,
} from 'lucide-react'

const features = [
  {
    id: 'sales',
    label: 'Sales',
    title: 'Point-of-Sale',
    description: 'Fast, intuitive checkout that works online and offline. Support for cash, cards, and mobile money.',
    icon: TrendingUp,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    title: 'Stock Control',
    description: 'Real-time inventory tracking across branches. Low stock alerts and automated reordering.',
    icon: BarChart3,
  },
  {
    id: 'team',
    label: 'Team',
    title: 'Staff Management',
    description: 'Role-based access control, shift management, and staff performance tracking.',
    icon: Users,
  },
  {
    id: 'security',
    label: 'Security',
    title: 'Enterprise Grade',
    description: 'Encrypted transactions, audit trails, and secure role-based permissions.',
    icon: Lock,
  },
]

const testimonials = [
  {
    name: 'Miriam Kipchoge',
    company: 'RetailCo Kenya',
    text: 'Pesaby cut our checkout time by 40% and made managing 5 branches incredibly simple.',
    rating: 5,
  },
  {
    name: 'James Otieno',
    company: 'The Hungry Table',
    text: 'The integration with M-Pesa was seamless. Our team productivity increased immediately.',
    rating: 5,
  },
  {
    name: 'Dr. Amelia Kimani',
    company: 'MedPlus Pharmacy',
    text: 'Stock expiry tracking alone has saved us thousands. Highly recommended for pharmacies.',
    rating: 5,
  },
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState('sales')

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm text-white">
              P
            </div>
            <span className="text-lg">Pesaby</span>
          </Link>

          <div className="hidden gap-8 md:flex">
            {['Features', 'Pricing', 'Security', 'Contact'].map((item) => (
              <Link key={item} href="#" className="text-sm font-medium text-gray-700 hover:text-primary transition">
                {item}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition sm:inline-block"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 transition"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="bg-primary py-20 md:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <h1 className="text-4xl font-black leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
                  Powering modern commerce
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-green-100">
                  Pesaby is the all-in-one business OS for retailers, restaurants, and pharmacies. Manage sales, inventory, customers, and reports from one clean platform.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-3 font-bold text-primary hover:bg-gray-50 transition"
                  >
                    Start free trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-white px-7 py-3 font-bold text-white hover:bg-white/10 transition">
                    Watch demo
                  </button>
                </div>
                <p className="mt-6 text-sm text-green-100">
                  ✓ Free for 30 days • No card required • 24/7 support
                </p>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-xl bg-gradient-to-br from-green-400/20 to-green-600/20 p-8">
                  <div className="h-full rounded-lg bg-white/5 backdrop-blur border border-white/10 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-16 w-16 text-white/80 mx-auto mb-4" />
                      <p className="text-white/60 font-medium">Dashboard preview</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Features */}
        <section className="py-20 md:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">
                Built for real commerce
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Everything retailers, restaurants, and pharmacies need in one platform
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon
                const isActive = activeFeature === feature.id
                return (
                  <button
                    key={feature.id}
                    onClick={() => setActiveFeature(feature.id)}
                    className={`rounded-xl p-6 text-left transition ${
                      isActive
                        ? 'bg-primary text-white shadow-lg'
                        : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-8 w-8 mb-4" />
                    <h3 className="font-bold text-lg">{feature.label}</h3>
                    <p className={`mt-2 text-sm leading-relaxed ${isActive ? 'text-green-100' : 'text-gray-600'}`}>
                      {feature.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-gray-50 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 text-center md:grid-cols-3">
              {[
                { number: '8,500+', label: 'Businesses trust Pesaby' },
                { number: '50+', label: 'Daily workflows automated' },
                { number: '99.9%', label: 'Platform uptime guaranteed' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-4xl font-black text-primary md:text-5xl">{stat.number}</p>
                  <p className="mt-2 text-gray-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 md:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-black tracking-tight md:text-4xl mb-12">
              Trusted by businesses across Kenya
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {testimonials.map((testimonial, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-8 hover:shadow-lg transition">
                  <div className="flex gap-1 mb-4">
                    {Array(testimonial.rating).fill(null).map((_, i) => (
                      <span key={i} className="text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">{testimonial.text}</p>
                  <div>
                    <p className="font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.company}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-gray-900 text-white py-20 md:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tight md:text-4xl">
                  Enterprise security built in
                </h2>
                <p className="mt-6 text-lg text-gray-300 leading-relaxed">
                  Your business data is protected with military-grade encryption, regular security audits, and compliance with international standards.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    'End-to-end encryption',
                    'Role-based access control',
                    'Audit trails and logging',
                    'Daily backups',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 p-8 border border-green-500/20">
                  <Lock className="h-24 w-24 text-green-500/80 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-primary to-green-600 py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              Ready to transform your business?
            </h2>
            <p className="mt-4 text-lg text-green-100">
              Join thousands of businesses running on Pesaby. Free for 30 days.
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-3 font-bold text-primary hover:bg-gray-50 transition"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 font-black mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-xs">
                    P
                  </div>
                  <span>Pesaby</span>
                </div>
                <p className="text-sm text-gray-600">The business OS for modern commerce.</p>
              </div>
              <div>
                <h4 className="font-bold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  {['Features', 'Pricing', 'Security', 'Roadmap'].map((item) => (
                    <li key={item}>
                      <Link href="#" className="hover:text-primary transition">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                    <li key={item}>
                      <Link href="#" className="hover:text-primary transition">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  {['Privacy', 'Terms', 'Security', 'Compliance'].map((item) => (
                    <li key={item}>
                      <Link href="#" className="hover:text-primary transition">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
              <p>&copy; 2024 Pesaby. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
