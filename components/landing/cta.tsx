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
        <div className="max-w-3xl mx-auto text-center">
          {/* Eyebrow */}
          <p className="text-xs font-semibold uppercase tracking-widest section-dark-muted mb-6">
            Get started today
          </p>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold section-dark-text tracking-tight text-balance mb-6 leading-[1.1]">
            Build a stronger operating rhythm.
            <br />
            <span className="text-accent-foreground">Run it on Imara.</span>
          </h2>

          {/* Subheadline */}
          <p className="text-base section-dark-muted leading-relaxed mb-10 max-w-xl mx-auto">
            Replace disconnected tools with one reliable platform for sales, inventory, payments, teams and reporting.
          </p>

          {/* Reasons grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {reasons.map((r) => (
              <div key={r} className="flex items-start gap-2 text-left">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs section-dark-muted leading-relaxed">{r}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-sm px-8 py-3.5 rounded-lg hover:opacity-90 transition-opacity duration-150 fluent-shadow-8"
            >
              Start Free — No Card Required
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="mailto:hello@imara.co"
              className="inline-flex items-center gap-2 border section-dark-border section-dark-muted font-medium text-sm px-8 py-3.5 rounded-lg hover:section-dark-text transition-all duration-150"
            >
              Talk to Sales
            </Link>
          </div>

          <p className="text-xs section-dark-muted/60">
            30-day free trial &middot; No credit card &middot; Full access to all features &middot; Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
