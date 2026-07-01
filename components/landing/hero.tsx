'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck2, CheckCircle2, TrendingUp, PackageCheck, ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'

const assurances = [
  'Start in minutes',
  'Works across branches',
  'Built for African commerce',
]

const benefits = [
  { icon: ReceiptText, label: 'Fast Checkout', description: 'Sell in-store, online, or at branch counters' },
  { icon: PackageCheck, label: 'Live Stock Control', description: 'Know what is selling, low, or stuck' },
  { icon: TrendingUp, label: 'Clear Daily Numbers', description: 'Revenue, profit, payments, and teams' },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] },
})

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-[#f6f6f3]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute inset-x-0 top-0 h-[68%] bg-[linear-gradient(180deg,#e4efe7_0%,#f6f6f3_74%)]" />
        <div className="absolute left-1/2 top-20 h-[420px] w-[min(920px,90vw)] -translate-x-1/2 rounded-full bg-white/55 blur-3xl" />
      </div>

      <div className="container-wide relative pb-16 pt-16 sm:pb-20 sm:pt-24 lg:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div {...fadeUp(0)}>
            <span className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#cbd8c7] bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#1f5132] shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1f5132]" aria-hidden="true" />
              Commerce operating system for growing teams
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.06)}
            className="px-3 font-semibold leading-[0.98] tracking-tight text-foreground"
            style={{ fontSize: 'clamp(2.4rem, 8vw, 5.9rem)' }}
          >
            Run your store like a modern commerce brand.
          </motion.h1>

          <motion.p
            {...fadeUp(0.12)}
            className="mx-auto mt-5 max-w-2xl px-3 text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            IMARA brings POS, inventory, payments, customers, staff, and branch performance into one clean workspace built for fast-moving retailers, restaurants, and pharmacies.
          </motion.p>

          <motion.div
            {...fadeUp(0.18)}
            className="mt-8 flex flex-col items-center justify-center gap-3 px-3 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-md bg-[#1f5132] px-7 text-base font-bold text-white shadow-lg shadow-[#1f5132]/25 transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#174327] hover:shadow-xl hover:shadow-[#1f5132]/30 active:translate-y-0 sm:w-auto"
            >
              <Link href="/sign-up" className="group inline-flex items-center justify-center gap-2.5">
                Start Free Trial
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-md border-2 bg-white/80 px-7 text-base font-semibold transition-all duration-150 hover:bg-white sm:w-auto"
            >
              <Link href="mailto:hello@imara.co.ke" className="inline-flex items-center justify-center gap-2.5">
                <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                Book a Demo
              </Link>
            </Button>
          </motion.div>

          <motion.div
            {...fadeUp(0.24)}
            className="mt-5 flex flex-col flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 text-[13px] font-medium text-muted-foreground sm:flex-row"
          >
            {assurances.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckCircle2
                  className="h-3.5 w-3.5 flex-shrink-0 text-[#1f5132]"
                  aria-hidden="true"
                />
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto mt-12 max-w-5xl px-3 sm:px-0"
        >
          <div className="overflow-hidden rounded-lg border border-border bg-white shadow-[0_24px_80px_rgba(31,81,50,0.12)]">
            <div className="grid gap-px bg-border sm:grid-cols-3">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <motion.div
                  key={benefit.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="group relative bg-white p-5 transition-all duration-300 hover:bg-[#fbfbf7] sm:p-6"
                >
                  <div className="flex items-start gap-4 text-left">
                    <div className="rounded-md bg-[#e4efe7] p-2.5 text-[#1f5132] transition-colors group-hover:bg-[#d8e8dc]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="mb-1.5 text-sm font-semibold text-foreground sm:text-base">{benefit.label}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
