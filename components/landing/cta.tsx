'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function LandingCTA() {
  return (
    <section className="py-20 md:py-32">
      <div className="mx-auto max-w-4xl px-6">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-12 md:p-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to grow your business?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Join hundreds of Kenyan businesses already using BizOS to streamline operations, 
            increase sales, and serve customers better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:shadow-lg"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="mailto:support@bizos.ke"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg border border-foreground text-foreground font-semibold hover:bg-foreground/5 transition-all"
            >
              Get a demo
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-8">
            No credit card required. 30 days free. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  )
}
