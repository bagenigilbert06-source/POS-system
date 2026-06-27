'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-36 md:pt-44 md:pb-52 bg-gradient-to-b from-background via-background to-primary/3">
      {/* MD3 Subtle gradient blobs - softer, more elegant */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 -translate-x-1/2 -translate-y-1/3 w-96 h-96 bg-primary/6 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-0 right-1/4 translate-x-1/2 translate-y-1/3 w-80 h-80 bg-secondary/5 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Material Design 3 - Premium Badge with proper elevation */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 bg-secondary/40 backdrop-blur-md elevation-1 hover:elevation-2 transition-all duration-200">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-md3-label-medium text-foreground">
              Trusted by 5000+ Kenyan businesses
            </span>
          </div>
        </div>

        {/* Main Headline - MD3 Display Scale */}
        <h1 className="text-md3-display-large md:text-md3-display-medium text-center mb-8 bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-transparent leading-tight">
          Strong business, better future
        </h1>

        {/* Subheading - MD3 Body Style */}
        <p className="text-md3-body-large text-center text-on-surface-variant max-w-3xl mx-auto mb-14 leading-relaxed">
          IMARA is the all-in-one POS and business platform built for Kenyan enterprises. Smart checkout, real-time inventory, M-Pesa integration, and powerful insights—all in one place.
        </p>

        {/* CTA buttons - Material Design 3 Button Styles */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link
            href="/sign-up"
            className="md3-btn-filled gap-2"
          >
            Start your free trial
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="#features"
            className="md3-btn-outlined"
          >
            See how it works
          </Link>
        </div>

        {/* Trust indicators - MD3 Chip/Assist Chip style */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {[
            '30-day free trial',
            'No credit card',
            'Enterprise security',
          ].map((indicator, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 bg-secondary/30 border border-border rounded-full px-4 py-2.5 elevation-0 hover:elevation-1 transition-all duration-200 group cursor-default">
              <CheckCircle2 className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-200" />
              <span className="text-md3-label-medium text-muted-foreground">{indicator}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
