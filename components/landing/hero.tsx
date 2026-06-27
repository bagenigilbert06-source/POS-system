import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative bg-background overflow-hidden pt-16 pb-0 md:pt-24">
      <div className="container-wide">
        {/* Top text block — centred */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto pb-14 md:pb-20">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">
              Kenya&apos;s #1 Business Operating System — 5,000+ businesses
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.1] text-balance mb-6">
            Everything your business needs.{' '}
            <span className="text-primary">All in one place.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-4 text-balance">
            Imara replaces your POS, inventory system, customer records, staff management, supplier tracking, and reports with a single, beautifully simple cloud platform built for Kenyan businesses.
          </p>

          <p className="text-sm text-muted-foreground mb-10">
            Trusted by supermarkets, salons, restaurants, pharmacies, hardware stores and wholesalers across Kenya.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
            <Link href="/sign-up" className="fluent-btn-primary px-7 py-3 text-sm">
              Start Free — No Card Needed
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#features" className="fluent-btn-secondary px-7 py-3 text-sm">
              See How It Works
            </Link>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-5">
            {[
              '30-day free trial',
              'No credit card required',
              'Setup in under 2 hours',
              'Cancel anytime',
            ].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview — sits at the bottom, bleeds into stats section */}
        <div className="relative mx-auto max-w-5xl">
          {/* Fade out at bottom so it blends into the next section */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

          <div className="rounded-t-2xl border border-border border-b-0 overflow-hidden fluent-shadow-64 ring-1 ring-border/50">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-card border-b border-border shrink-0">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              <div className="mx-auto flex items-center gap-2 rounded-md border border-border bg-background px-4 py-1 text-[11px] text-muted-foreground w-52">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                app.imara.co/dashboard
              </div>
            </div>
            <Image
              src="/dashboard-preview.png"
              alt="Imara business dashboard showing sales, inventory and analytics"
              width={1200}
              height={750}
              className="w-full object-cover object-top"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
