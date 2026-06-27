import Link from 'next/link'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    description: 'For kiosks and small shops just getting started.',
    price: 'Free',
    period: '30-day trial',
    cta: 'Start for free',
    features: [
      '1 POS terminal',
      'Up to 500 products',
      'Basic inventory tracking',
      'Daily sales reports',
      'M-Pesa integration',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    description: 'For retailers and restaurants ready to scale.',
    price: 'KES 2,999',
    period: '/ month',
    popular: true,
    cta: 'Get started',
    features: [
      'Unlimited terminals',
      'Unlimited products',
      'Advanced inventory & reorder',
      'Real-time analytics',
      'M-Pesa + card + cash',
      'Customer loyalty program',
      'Staff management & shifts',
      'Phone + email support',
    ],
  },
  {
    name: 'Enterprise',
    description: 'For large retail chains and franchise operations.',
    price: 'Custom',
    period: 'talk to us',
    cta: 'Contact sales',
    features: [
      'Everything in Growth',
      'Multi-branch management',
      'Dedicated account manager',
      'REST API access',
      'Custom integrations',
      'Advanced security & audit logs',
      '99.9% SLA guarantee',
      'Priority onboarding',
    ],
  },
]

export function LandingPricing() {
  return (
    <section id="pricing" className="section-padding bg-card/30">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-eyebrow mb-3">Pricing</p>
          <h2 className="section-heading mb-4">Plans for every stage of growth.</h2>
          <p className="section-subheading mx-auto">
            Start free. Upgrade when you&apos;re ready. No hidden fees, ever.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 flex flex-col gap-7 transition-all duration-200 ${
                plan.popular
                  ? 'border-primary bg-primary text-primary-foreground fluent-shadow-16 md:-mt-4 md:mb-0'
                  : 'border-border bg-background fluent-shadow-2 hover:fluent-shadow-8'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-foreground text-background text-[11px] font-bold px-3 py-1 tracking-wide">
                  Most popular
                </span>
              )}

              {/* Plan header */}
              <div>
                <h3 className={`text-lg font-bold mb-1 ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm ${plan.popular ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div>
                <div className={`flex items-baseline gap-1.5 ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`}>
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className={`text-sm ${plan.popular ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {plan.period}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/sign-up"
                className={`w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 border ${
                  plan.popular
                    ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90 border-transparent'
                    : 'border-border hover:bg-secondary text-foreground'
                }`}
              >
                {plan.cta}
              </Link>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.popular ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className={`text-sm ${plan.popular ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          All plans include a 30-day free trial. No credit card required to start.
        </p>
      </div>
    </section>
  )
}
