'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-28 md:pt-32 md:pb-40">
      {/* Gradient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 -translate-y-1/2 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 bg-background/50 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Trusted by 5000+ Kenyan businesses
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-center leading-tight mb-6">
          Enterprise POS
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-primary/60">
            For Kenyan Businesses
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-center text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          All-in-one business management system. POS terminal, inventory management, real-time analytics, and M-Pesa payments. 
          Built for Kenya's businesses, trusted by enterprises across East Africa.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all hover:shadow-lg"
          >
            Start your free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-secondary transition-all"
          >
            See how it works
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 text-sm text-muted-foreground items-center">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>30-day free trial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>No credit card</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Enterprise security</span>
          </div>
        </div>
      </div>
    </section>
  )
}
