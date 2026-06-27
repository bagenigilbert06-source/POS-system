'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardPreview } from '@/components/landing/dashboard-preview'

const assurances = ['Start in minutes', 'Works across branches', 'Built for African commerce']

export function LandingHero() {
  return (
    <section className="overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-wide relative py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            The Business Operating System for Modern African Businesses
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }}
            className="text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white"
          >
            Run Your Entire Business From One Platform
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
            className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg dark:text-slate-300"
          >
            Imara unifies POS, inventory, customers, suppliers, payments, employees, reporting, analytics, and multi-branch operations in one reliable cloud workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="h-12 rounded-xl px-6 font-semibold shadow-lg shadow-blue-600/20">
              <Link href="/sign-up">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-slate-300 px-6 font-semibold">
              <Link href="mailto:hello@imara.co">
                <CalendarCheck2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Book a Demo
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2, ease: 'easeOut' }}
            className="mt-7 flex flex-col items-center justify-center gap-3 text-sm text-slate-500 sm:flex-row sm:gap-6 dark:text-slate-400"
          >
            {assurances.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
          className="mx-auto mt-14 max-w-6xl"
        >
          <DashboardPreview compact />
        </motion.div>
      </div>
    </section>
  )
}
