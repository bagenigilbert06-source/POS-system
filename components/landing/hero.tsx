import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Typewriter } from './typewriter'

export function LandingHero() {
  return (
    <section className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
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
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center">
          {/* Subtle badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-10 text-xs font-medium text-primary/80 tracking-wide uppercase">
            <span className="h-1 w-1 rounded-full bg-primary/60" />
            New
          </div>

          {/* Main headline - Apple-like simplicity */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.0] text-balance mb-6 text-white">
            Business tools
            <br />
            <span className="font-semibold text-primary">built for Kenya.</span>
          </h1>

          {/* Subheading with typewriter - elegant */}
          <p className="text-base sm:text-lg text-white/60 text-balance mb-8 font-light h-7 md:h-8">
            <Typewriter
              text="From notebooks to numbers in under 2 hours."
              speed={50}
              delay={400}
              cursor={false}
            />
          </p>

          {/* Clean CTA - minimal */}
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary/90 text-white font-medium px-8 py-3 transition-all duration-200 text-base shadow-lg hover:shadow-xl"
          >
            Start Free
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Supporting text */}
          <p className="text-xs text-white/50 mt-6 tracking-wide">
            30-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  )
}
