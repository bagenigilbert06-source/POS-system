'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function LandingCTA() {
  return (
    <section className="py-24 md:py-36 bg-gradient-to-b from-background via-background to-primary/2">
      <div className="mx-auto max-w-4xl px-6 relative">
        {/* MD3 Subtle background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/8 rounded-full blur-3xl opacity-40" />
          <div className="absolute bottom-0 right-1/4 translate-x-1/2 translate-y-1/3 w-80 h-80 bg-secondary/6 rounded-full blur-3xl opacity-30" />
        </div>

        {/* MD3 Elevated Surface Container */}
        <div className="rounded-3xl border border-border bg-gradient-to-br from-card to-card p-12 md:p-16 text-center elevation-2 hover:elevation-3 transition-all duration-200">
          {/* MD3 Headline Large */}
          <h2 className="text-md3-display-small mb-8 text-foreground">
            Ready to grow your business?
          </h2>
          
          {/* MD3 Body Large */}
          <p className="text-md3-body-large text-on-surface-variant max-w-2xl mx-auto mb-12">
            Join hundreds of Kenyan businesses already using IMARA to streamline operations, 
            increase sales, and serve customers better.
          </p>
          
          {/* CTA buttons - MD3 Button styles */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/sign-up"
              className="md3-btn-filled gap-2"
            >
              Start free trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="mailto:support@imara.ke"
              className="md3-btn-outlined"
            >
              Get a demo
            </Link>
          </div>
          
          {/* MD3 Label Medium */}
          <p className="text-md3-label-medium text-on-surface-variant">
            No credit card required • 30 days free • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
