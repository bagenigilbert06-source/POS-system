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
      <div className="mx-auto max-w-5xl">
        {/* Card container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-xl shadow-lg shadow-primary/10"
        >
          {/* Decorative elements */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-40 -bottom-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
          />

          {/* Content */}
          <div className="relative z-10 p-8 sm:p-10 md:p-12 lg:p-14">
            <div className="text-center">
              {/* Premium badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs sm:text-sm font-semibold text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Ready to transform your business?
              </motion.div>

              {/* Headline */}
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight text-balance mb-5 sm:mb-7 leading-[1.15]"
              >
                Build a stronger operating rhythm.
                <br className="hidden sm:inline" />
                <span className="relative inline-block">
                  <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-primary/20 to-primary/5 blur-lg" aria-hidden="true" />
                  <span className="relative text-primary font-extrabold">
                    Run it on Imara.
                  </span>
                </span>
              </motion.h2>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-10 sm:mb-12 max-w-2xl mx-auto"
              >
            Replace disconnected tools with one reliable platform for sales, inventory, payments, teams and reporting. Trusted by growing businesses across Africa.
          </motion.p>

              {/* Reasons grid */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-12 sm:mb-14"
              >
                {reasons.map((r) => (
                  <motion.div
                    key={r}
                    variants={itemVariants}
                    className="flex items-start gap-3 text-left rounded-lg border border-primary/15 bg-primary/8 p-4 hover:border-primary/30 hover:bg-primary/15 transition-all duration-200"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground leading-relaxed font-medium">{r}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10"
              >
                <Link
                  href="/sign-up"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-primary text-primary-foreground font-bold text-base px-8 py-3.5 sm:py-4 rounded-xl hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-150 min-h-[48px] group"
                >
                  Start Free — No Card Required
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
                <Link
                  href="mailto:hello@imara.co"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-primary text-primary font-semibold text-base px-8 py-3.5 sm:py-4 rounded-xl hover:bg-primary/10 transition-all duration-150 min-h-[48px]"
                >
                  Schedule a Demo
                </Link>
              </motion.div>

              {/* Trust indicators */}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium"
              >
                ✓ 30-day free trial &middot; ✓ No credit card &middot; ✓ Full access &middot; ✓ Cancel anytime
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
