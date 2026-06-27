'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-32 md:pt-40 md:pb-48">
      {/* Subtle gradient background - Material UI style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 -translate-x-1/2 -translate-y-1/3 w-96 h-96 bg-primary/8 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-1/4 translate-x-1/2 translate-y-1/3 w-80 h-80 bg-primary/6 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Premium Badge */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-4 py-2 bg-primary/5 backdrop-blur-xl hover:border-primary/40 transition-colors duration-300">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Trusted by 5000+ Kenyan businesses
            </span>
          </div>
        </div>

        {/* Main Headline - Material UI Typography */}
        <h1 className="text-4xl md:text-6xl lg:text-6xl font-bold text-center leading-tight mb-6 tracking-tight">
          <span className="block text-foreground">Strong business,</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
            better future
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-base md:text-lg text-center text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-light">
          IMARA is the all-in-one POS and business platform built for Kenyan enterprises. Smart checkout, real-time inventory, M-Pesa integration, and powerful insights—all in one place.
        </p>

        {/* CTA buttons - Material UI style */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 active:scale-95"
          >
            Start your free trial
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border text-foreground font-semibold hover:bg-secondary/30 transition-all duration-200 hover:border-primary/50 active:scale-95"
          >
            See how it works
          </Link>
        </div>

        {/* Trust indicators - Material UI Chip style */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
          {[
            '30-day free trial',
            'No credit card',
            'Enterprise security',
          ].map((indicator, idx) => (
            <div key={idx} className="inline-flex items-center gap-2 bg-secondary/40 border border-border rounded-full px-4 py-2 hover:bg-secondary/60 transition-colors">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground text-sm">{indicator}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
