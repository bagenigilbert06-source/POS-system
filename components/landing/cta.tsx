import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

const reasons = [
  'No technical knowledge required',
  'Import your existing products in minutes',
  'Payments ready out of the box',
  'Free onboarding support included',
]

export function LandingCTA() {
  return (
    <section className="section-padding-premium section-dark">
      <div className="container-wide">
        <div className="max-w-3xl mx-auto text-center px-4">
          {/* Eyebrow */}
          <p className="text-xs font-semibold uppercase tracking-widest section-dark-muted mb-4 sm:mb-6">
            Get started today
          </p>

          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold section-dark-text tracking-tight text-balance mb-4 sm:mb-6 leading-[1.1]">
            Build a stronger operating rhythm.
            <br className="hidden sm:inline" />
            <span className="text-accent-foreground">Run it on Imara.</span>
          </h2>

          {/* Subheadline */}
          <p className="text-sm sm:text-base section-dark-muted leading-relaxed mb-8 sm:mb-10 max-w-xl mx-auto">
            Replace disconnected tools with one reliable platform for sales, inventory, payments, teams and reporting.
          </p>

          {/* Reasons grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10 px-2 sm:px-0">
            {reasons.map((r) => (
              <div key={r} className="flex items-start gap-2 text-left">
                <CheckCircle2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm section-dark-muted leading-relaxed">{r}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 mb-6 sm:mb-8 px-2 sm:px-0">
            <Link
              href="/sign-up"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold text-sm px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg hover:opacity-90 transition-opacity duration-150 fluent-shadow-8 min-h-[44px]"
            >
              Start Free — No Card Required
              <ArrowRight className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
            </Link>
            <Link
              href="mailto:hello@imara.co"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border section-dark-border section-dark-muted font-medium text-sm px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg hover:section-dark-text transition-all duration-150 min-h-[44px]"
            >
              Talk to Sales
            </Link>
          </div>

          <p className="text-xs section-dark-muted/60 leading-relaxed">
            30-day free trial &middot; No credit card &middot; Full access &middot; Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
