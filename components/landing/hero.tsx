import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-0 md:pt-24">
      {/* Very subtle top tint */}
      <div className="absolute inset-x-0 top-0 h-px bg-border" />

      <div className="container-wide">
        {/* Text + CTA centred above image */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto pb-16 md:pb-20">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 mb-8 fluent-shadow-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">
              Trusted by 5,000+ businesses across Kenya
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-foreground leading-[1.1] text-balance mb-6">
            Run Your Entire Business{' '}
            <span className="text-primary">From One Platform.</span>
          </h1>

          {/* Description */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-10 text-balance">
            Imara helps businesses manage sales, inventory, payments, customers, suppliers, employees, analytics, and multi-branch operations from one modern cloud platform.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
            <Link href="/sign-up" className="fluent-btn-primary text-sm px-6 py-3">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#features" className="fluent-btn-secondary text-sm px-6 py-3">
              Book a Demo
            </Link>
          </div>

          {/* Trust chips */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {['30-day free trial', 'No credit card required', 'Cancel anytime'].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview — floats at the bottom, cut off to bleed into next section */}
        <div className="relative mx-auto max-w-5xl">
          {/* Glow under image */}
          <div className="absolute -inset-x-8 bottom-0 h-40 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
          <div className="rounded-t-2xl border border-border border-b-0 overflow-hidden fluent-shadow-64 ring-1 ring-border/40">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-card border-b border-border">
              <span className="h-3 w-3 rounded-full bg-border" />
              <span className="h-3 w-3 rounded-full bg-border" />
              <span className="h-3 w-3 rounded-full bg-border" />
              <div className="mx-auto flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground w-48">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                app.imara.co
              </div>
            </div>
            <Image
              src="/dashboard-preview.png"
              alt="Imara dashboard — sales, inventory and analytics at a glance"
              width={1200}
              height={720}
              className="w-full object-cover object-top"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
