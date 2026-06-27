import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Typewriter } from './typewriter'

export function LandingHero() {
  const benefits = [
    { icon: CheckCircle2, text: '30-day free trial' },
    { icon: CheckCircle2, text: 'No credit card required' },
    { icon: CheckCircle2, text: 'Setup in under 2 hours' },
    { icon: CheckCircle2, text: 'Cancel anytime' },
  ]

  return (
    <section className="relative bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-hidden">
      {/* Subtle background gradient accent */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background:
            'radial-gradient(circle at center, hsl(var(--primary)) 0%, transparent 60%)',
          filter: 'blur(100px)',
        }}
      />

      <div className="container-wide relative py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
          {/* Subtle badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-6 text-xs font-medium text-primary dark:text-primary/80 bg-primary/5 dark:bg-primary/20 tracking-wide uppercase">
            <span className="h-1 w-1 rounded-full bg-primary" />
            New
          </div>

          {/* Main headline - Apple-like elegance */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1] text-balance mb-4 text-foreground dark:text-white">
            Your business{' '}
            <span className="font-semibold text-primary">deserves</span>
            {' '}better tools.
          </h1>

          {/* Subheading with typewriter - elegant */}
          <p className="text-lg sm:text-xl text-muted-foreground dark:text-white/70 text-balance mb-6 font-light h-8 md:h-10">
            <Typewriter
              text="Imara is built for you."
              speed={60}
              delay={300}
              cursor={false}
            />
          </p>

          {/* Description */}
          <p className="text-base md:text-lg text-muted-foreground dark:text-white/60 leading-relaxed mb-8 text-pretty max-w-2xl font-light">
            Join 5,000+ Kenyan businesses who replaced messy notebooks, WhatsApp groups, and disconnected apps with Imara. Start free — be live in under 2 hours.
          </p>

          {/* CTA Buttons - dual CTAs but clean */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary/90 text-white font-medium px-8 py-3 transition-all duration-200 text-base shadow-lg hover:shadow-xl"
            >
              Start Free — No Card Required
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 dark:border-white/20 hover:border-foreground/40 dark:hover:border-white/40 text-foreground dark:text-white font-medium px-8 py-3 transition-all duration-200 text-base hover:bg-foreground/5 dark:hover:bg-white/5"
            >
              Talk to Sales
            </Link>
          </div>

          {/* Trust benefits grid - clean and organized */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-2xl w-full">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center justify-center gap-2 text-sm text-muted-foreground dark:text-white/70">
                <benefit.icon className="h-4 w-4 text-primary/70 dark:text-primary/60 flex-shrink-0" />
                <span className="font-light">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Supporting disclaimer */}
          <p className="text-xs text-muted-foreground/70 dark:text-white/50 tracking-wide">
            30-day free trial · No credit card · Full access to all features · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
