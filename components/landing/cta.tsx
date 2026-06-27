import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function LandingCTA() {
  return (
    <section className="section-padding bg-primary">
      <div className="container-wide">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-10">
          {/* Text */}
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight text-balance mb-4">
              Start running your business smarter.
            </h2>
            <p className="text-base text-primary-foreground/75 leading-relaxed">
              Join 5,000+ businesses across Kenya already using Imara. Set up in under two hours, cancel anytime.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start md:items-center gap-3 shrink-0">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary font-semibold text-sm px-6 py-3 rounded-lg hover:bg-primary-foreground/90 transition-colors duration-150"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="mailto:hello@imara.co"
              className="inline-flex items-center gap-2 border border-primary-foreground/30 text-primary-foreground font-semibold text-sm px-6 py-3 rounded-lg hover:bg-primary-foreground/10 transition-colors duration-150"
            >
              Schedule a Demo
            </Link>
          </div>
        </div>

        <p className="mt-8 text-xs text-primary-foreground/50">
          No credit card required &middot; 30-day free trial &middot; Cancel anytime
        </p>
      </div>
    </section>
  )
}
