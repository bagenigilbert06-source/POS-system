import { ArrowRight } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    title: 'Sign Up',
    description: 'Create your account in 2 minutes with your business details',
  },
  {
    number: '02',
    title: 'Configure',
    description: 'Set up your products, team members, and locations',
  },
  {
    number: '03',
    title: 'Go Live',
    description: 'Start processing transactions and managing inventory immediately',
  },
  {
    number: '04',
    title: 'Grow',
    description: 'Scale to multiple locations with unified management',
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 md:py-28 bg-primary/5 border-y border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Getting Started is Simple
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From signup to first sale in under an hour.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
          {STEPS.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="hidden md:block absolute top-12 left-[50%] w-full h-0.5 bg-border/30 -translate-x-1/2 translate-x-1/2"
                />
              )}

              <div className="relative z-10">
                <div className="mb-4 inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {step.number}
                </div>

                <div className="rounded-xl border border-border bg-background p-6">
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
