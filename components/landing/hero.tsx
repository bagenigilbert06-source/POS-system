'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardPreview } from '@/components/landing/dashboard-preview'

const assurances = [
  'Start in minutes',
  'Works across branches',
  'Built for African commerce',
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.25, 0.1, 0.25, 1] },
})

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      {/* Subtle radial glow behind the content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-start justify-center"
      >
        <div className="h-[560px] w-[900px] rounded-full bg-blue-600/[0.06] blur-3xl dark:bg-blue-500/[0.08]" />
      </div>

      <div className="container-wide relative py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <motion.div {...fadeUp(0)}>
            <span className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Business OS for African Commerce
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            {...fadeUp(0.06)}
            className="text-[2.6rem] font-semibold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white"
          >
            Run Your Entire Business{' '}
            <span className="text-primary">From One Platform</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            {...fadeUp(0.12)}
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-500 sm:text-lg dark:text-slate-400"
          >
            Imara unifies POS, inventory, customers, suppliers, payments,
            employees, and multi-branch operations in one reliable cloud
            workspace — purpose-built for African markets.
          </motion.p>

          {/* CTAs */}
          <motion.div
            {...fadeUp(0.18)}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="h-11 rounded-xl px-6 font-semibold shadow-md shadow-blue-600/20 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]"
            >
              <Link href="/sign-up">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 rounded-xl border-slate-200 px-6 font-medium transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              <Link href="mailto:hello@imara.co">
                <CalendarCheck2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Book a Demo
              </Link>
            </Button>
          </motion.div>

          {/* Assurances */}
          <motion.div
            {...fadeUp(0.24)}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-medium text-slate-500 dark:text-slate-500"
          >
            {assurances.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckCircle2
                  className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto mt-14 max-w-5xl"
        >
          <DashboardPreview compact />
        </motion.div>
      </div>
    </section>
  )
}