import Link from 'next/link'
import { ArrowRight, Shield, Clock, Globe } from 'lucide-react'

const trust = [
  { icon: Clock, text: '30-day free trial' },
  { icon: Shield, text: 'No credit card required' },
  { icon: Globe, text: 'Cancel anytime' },
]

export function LandingCTA() {
  return (
    <section className="section-padding-premium border-b border-border bg-[#eef2e8]">
      <div className="container-wide">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-eyebrow mb-5">Get Started</p>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.05] mb-6 text-balance">
            Start running your business with PESABY.
          </h2>

          <p className="text-lg text-muted-foreground leading-relaxed mb-10 text-balance">
            Replace every disconnected tool with one reliable platform. Sales, inventory, customers, suppliers, employees, and reports — all connected, all working.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link
              href="/sign-up"
              className="group inline-flex items-center justify-center gap-2.5 rounded-md bg-[#1f5132] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#1f5132]/25 transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#174327] hover:shadow-xl hover:shadow-[#1f5132]/30 active:translate-y-0 w-full sm:w-auto"
            >
              Start for Free — No Card Required
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
            <Link
              href="mailto:hello@pesaby.co"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-8 py-4 text-base font-semibold text-foreground transition-all duration-150 hover:bg-card w-full sm:w-auto"
            >
              Schedule a Demo
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6">
            {trust.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                  {item.text}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
