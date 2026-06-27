import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

const reasons = [
  'No technical knowledge required',
  'Import your existing products in minutes',
  'M-Pesa ready out of the box',
  'Free onboarding support included',
]

export function LandingCTA() {
  return (
    <section className="section-padding-premium section-dark">
      <div className="container-wide">
        <div className="max-w-3xl mx-auto text-center">
          {/* Eyebrow */}
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-6">
            Get started today
          </p>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight text-balance mb-6 leading-[1.1]">
            Your business deserves better tools.
            <br />
            <span className="text-primary">Imara is built for you.</span>
          </h2>

          {/* Subheadline */}
          <p className="text-base text-white/60 leading-relaxed mb-10 max-w-xl mx-auto">
            Join 5,000+ Kenyan businesses who replaced messy notebooks, WhatsApp groups, and disconnected apps with Imara. Start free — be live in under 2 hours.
          </p>

          {/* Reasons grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {reasons.map((r) => (
              <div key={r} className="flex items-start gap-2 text-left">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-xs text-white/70 leading-relaxed">{r}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-8 py-3.5 rounded-lg hover:bg-primary/90 transition-colors duration-150 fluent-shadow-8"
            >
              Start Free — No Card Required
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="mailto:hello@imara.co"
              className="inline-flex items-center gap-2 border border-white/20 text-white/80 font-medium text-sm px-8 py-3.5 rounded-lg hover:bg-white/5 hover:text-white transition-all duration-150"
            >
              Talk to Sales
            </Link>
          </div>

          <p className="text-xs text-white/30">
            30-day free trial &middot; No credit card &middot; Full access to all features &middot; Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
