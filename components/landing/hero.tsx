'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, TrendingUp, TrendingDown, Package, Users, ShoppingCart, BarChart3, AlertCircle } from 'lucide-react'

const assurances = [
  'No credit card required',
  'Up and running in minutes',
  'Built for African commerce',
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
})

// Dashboard mockup data
const metrics = [
  { label: "Today's Revenue", value: 'KES 84,320', change: '+12.4%', up: true, icon: TrendingUp },
  { label: 'Orders', value: '247', change: '+8.1%', up: true, icon: ShoppingCart },
  { label: 'Inventory Items', value: '1,842', change: '-3 low stock', up: false, icon: Package },
  { label: 'Active Customers', value: '3,291', change: '+41 today', up: true, icon: Users },
]

const recentSales = [
  { name: 'Wanjiku M.', amount: 'KES 2,840', time: '2m ago', type: 'Retail' },
  { name: 'Brian O.', amount: 'KES 1,200', time: '5m ago', type: 'Pharmacy' },
  { name: 'Table #4', amount: 'KES 4,600', time: '8m ago', type: 'Restaurant' },
  { name: 'Amina H.', amount: 'KES 750', time: '11m ago', type: 'Salon' },
]

const barData = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88]
const barDays = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function DashboardMockup() {
  return (
    <div className="relative w-full rounded-xl border border-border bg-card shadow-xl-soft overflow-hidden select-none" aria-hidden="true">
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="text-[11px] text-muted-foreground font-medium">IMARA — Business Dashboard</span>
        </div>
      </div>

      <div className="flex h-[420px] md:h-[480px]">
        {/* Sidebar */}
        <div className="hidden md:flex w-44 flex-col border-r border-border bg-secondary/30 px-2 py-4 gap-0.5 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground mb-3">
            <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs font-semibold">Overview</span>
          </div>
          {['Point of Sale', 'Inventory', 'Customers', 'Purchasing', 'Employees', 'Analytics', 'Reports', 'Settings'].map((item) => (
            <div key={item} className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0" />
              <span className="text-[11px] font-medium truncate">{item}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-xs font-bold text-foreground">Good morning, Grace</p>
              <p className="text-[10px] text-muted-foreground">Wednesday, 1 July 2026</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-muted-foreground font-medium">All systems online</span>
            </div>
          </div>

          <div className="flex-1 p-3 md:p-4 overflow-hidden">
            {/* Metrics row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              {metrics.map((m) => {
                const Icon = m.icon
                return (
                  <div key={m.label} className="rounded-lg border border-border bg-background p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-muted-foreground font-medium truncate">{m.label}</p>
                      <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </div>
                    <p className="text-sm font-bold text-foreground leading-none mb-1">{m.value}</p>
                    <p className={`text-[10px] font-medium ${m.up ? 'text-green-500' : 'text-amber-500'}`}>{m.change}</p>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
              {/* Bar chart */}
              <div className="lg:col-span-3 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-foreground">Revenue Overview</p>
                  <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">2026</span>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {barData.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm bg-primary/80"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {barDays.filter((_, i) => i % 2 === 0).map((d) => (
                    <span key={d} className="text-[8px] text-muted-foreground">{d}</span>
                  ))}
                </div>
              </div>

              {/* Recent sales */}
              <div className="lg:col-span-2 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-foreground">Recent Sales</p>
                  <AlertCircle className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  {recentSales.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-[8px] font-bold text-primary">{s.name[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-foreground truncate">{s.name}</p>
                          <p className="text-[9px] text-muted-foreground">{s.time}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-semibold text-foreground">{s.amount}</p>
                        <p className="text-[9px] text-muted-foreground">{s.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="container-wide relative section-padding-premium pb-0">
        {/* Text block — centered, editorial */}
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow badge */}
          <motion.div {...fadeUp(0)}>
            <span className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
              Business Operating System
            </span>
          </motion.div>

          {/* Headline — bold, editorial */}
          <motion.h1
            {...fadeUp(0.07)}
            className="font-bold leading-[1.08] tracking-tight text-foreground"
            style={{ fontSize: 'clamp(2.4rem, 7vw, 5rem)' }}
          >
            Run your entire{' '}
            <br className="hidden sm:block" />
            business from{' '}
            <span className="text-primary">one place.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            {...fadeUp(0.14)}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
          >
            IMARA is a complete Business OS — not just a POS. Sales, inventory,
            customers, purchasing, finance, employees, and multi-branch operations
            in one platform purpose-built for growing businesses.
          </motion.p>

          {/* CTAs */}
          <motion.div
            {...fadeUp(0.2)}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/sign-up"
              className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-primary/25 transition-all duration-150 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto"
            >
              Start for Free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
            <Link
              href="mailto:hello@imara.co"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-8 py-3.5 text-base font-semibold text-foreground transition-all duration-150 hover:bg-secondary w-full sm:w-auto"
            >
              Book a Demo
            </Link>
          </motion.div>

          {/* Assurances */}
          <motion.div
            {...fadeUp(0.26)}
            className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-medium text-muted-foreground"
          >
            {assurances.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" aria-hidden="true" />
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Dashboard mockup — below the copy, full width */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-16 max-w-5xl px-0 pb-0"
        >
          {/* Browser chrome outer wrapper */}
          <div className="rounded-t-2xl border border-border border-b-0 overflow-hidden shadow-xl-soft">
            <DashboardMockup />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
