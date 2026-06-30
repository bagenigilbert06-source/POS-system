'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'

const reasons = [
  'No technical knowledge required',
  'Import your existing products in minutes',
  'Payments ready out of the box',
  'Free onboarding support included',
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
}

export function LandingCTA() {
  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 bg-background">
      <div className="mx-auto max-w-4xl">
        {/* Card container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-primary/20 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm p-8 sm:p-10 md:p-12"
        >
          <div className="text-center">
            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight text-balance mb-4 sm:mb-6 leading-[1.2]"
            >
              Build a stronger operating rhythm.
              <br />
              <span className="text-primary">Run it on Imara.</span>
            </motion.h2>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-base text-muted-foreground leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto"
            >
              Replace disconnected tools with one reliable platform for sales, inventory, payments, teams and reporting.
            </motion.p>

            {/* Reasons grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-10 sm:mb-12 max-w-2xl mx-auto"
            >
              {reasons.map((r) => (
                <motion.div
                  key={r}
                  variants={itemVariants}
                  className="flex items-start gap-2 text-left text-sm"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-muted-foreground">{r}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 sm:mb-8"
            >
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold text-base px-7 py-3 rounded-lg hover:shadow-lg hover:shadow-primary/40 transition-all duration-200 min-h-[44px] group"
              >
                Start Free — No Card Required
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </Link>
              <Link
                href="mailto:hello@imara.co"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-primary/40 text-foreground font-semibold text-base px-7 py-3 rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 min-h-[44px]"
              >
                Schedule a Demo
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-xs text-muted-foreground"
            >
              30-day free trial · No credit card · Full access · Cancel anytime
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
