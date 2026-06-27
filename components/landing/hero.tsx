import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Package,
  CreditCard,
  Users,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

export function LandingHero() {
  const benefits = [
    { icon: Zap, text: '30-day free trial' },
    { icon: CheckCircle2, text: 'No credit card required' },
    { icon: Package, text: 'Setup in under 2 hours' },
    { icon: Users, text: 'Cancel anytime' },
  ]

  return (
    <section className="relative bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
      {/* Background gradient accent */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl mx-auto pointer-events-none opacity-30"
        style={{
          background:
            'radial-gradient(circle at center, hsl(var(--primary)) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="container-wide relative py-24 md:py-32 lg:py-40">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-8 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary tracking-wide">
              GET STARTED TODAY
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.0] text-balance mb-6 text-white">
            Your business{' '}
            <span className="text-primary">deserves</span>
            {' '}better tools.
          </h1>

          {/* Subheading with brand highlight */}
          <p className="text-2xl sm:text-3xl font-bold text-primary text-balance mb-6">
            Imara is built for you.
          </p>

          {/* Description */}
          <p className="text-base md:text-lg text-white/70 leading-relaxed mb-8 text-pretty max-w-2xl">
            Join 5,000+ Kenyan businesses who replaced messy notebooks, WhatsApp groups, and disconnected apps with Imara. Start free — be live in under 2 hours.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3.5 transition-all duration-200 text-base"
            >
              Start Free — No Card Required
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 hover:bg-white/5 text-white font-semibold px-8 py-3.5 transition-all duration-200 text-base"
            >
              Talk to Sales
            </Link>
          </div>

          {/* Trust benefits grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-2xl">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div key={benefit.text} className="flex items-center gap-2 text-sm text-white/70">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span>{benefit.text}</span>
                </div>
              )
            })}
          </div>

          {/* Bottom disclaimer text */}
          <p className="text-xs text-white/50 tracking-wide">
            30-day free trial · No credit card · Full access to all features · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
