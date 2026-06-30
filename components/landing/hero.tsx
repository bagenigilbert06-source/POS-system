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
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Subtle radial glow behind the content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden"
      >
        <div className="h-[320px] w-[320px] sm:h-[560px] sm:w-[900px] rounded-full bg-blue-600/[0.06] dark:bg-blue-500/[0.08]" />
      </div>

      <div className="container-wide relative section-padding-premium">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <motion.div {...fadeUp(0)}>
            <span className="mx-auto mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground shadow-sm">
              <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Business OS for African Commerce
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            {...fadeUp(0.06)}
            className="font-semibold leading-tight tracking-tight text-foreground"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 3.5rem)' }}
          >
            Run Your Entire Business{' '}
            <span className="text-primary">From One Platform</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            {...fadeUp(0.12)}
            className="mx-auto mt-3 sm:mt-5 max-w-xl px-2 text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
          >
            Imara unifies POS, inventory, customers, suppliers, payments,
            employees, and multi-branch operations in one reliable cloud
            workspace — purpose-built for African markets.
          </motion.p>

          {/* CTAs */}
          <motion.div
            {...fadeUp(0.18)}
            className="mt-7 sm:mt-10 flex flex-col items-center justify-center gap-3 sm:gap-3.5 px-2"
          >
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-12 sm:h-13 rounded-xl px-8 sm:px-10 font-bold text-base shadow-lg shadow-blue-600/30 transition-all duration-150 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
            >
              <Link href="/sign-up" className="group inline-flex items-center gap-2.5">
                Start Free Trial
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 sm:h-13 rounded-xl px-8 sm:px-10 font-semibold text-base border-2 hover:bg-secondary/80 transition-all duration-150"
            >
              <Link href="mailto:hello@imara.co" className="inline-flex items-center gap-2.5">
                <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
                Book a Demo
              </Link>
            </Button>
          </motion.div>

          {/* Assurances */}
          <motion.div
            {...fadeUp(0.24)}
            className="mt-4 sm:mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs sm:text-[13px] font-medium text-muted-foreground"
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
          className="mx-auto mt-10 sm:mt-12 md:mt-14 max-w-5xl px-2 sm:px-0"
        >
          <DashboardPreview compact />
        </motion.div>
      </div>
    </section>
  )
}
