'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'

export function LandingPricing() {
  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for kiosks and small shops',
      price: 'Free',
      period: 'first 30 days',
      features: [
        'Single POS terminal',
        'Basic inventory',
        'Daily reports',
        'M-Pesa integration',
        'Up to 500 products',
        'Email support',
      ],
    },
    {
      name: 'Professional',
      description: 'For retailers and restaurants',
      price: 'KES 2,999',
      period: 'per month',
      popular: true,
      features: [
        'Multi-terminal support',
        'Advanced inventory tracking',
        'Real-time analytics',
        'M-Pesa, Card, Cash payments',
        'Unlimited products',
        'Phone + email support',
        'Customer loyalty program',
        'Staff management',
      ],
    },
    {
      name: 'Enterprise',
      description: 'For large retail chains',
      price: 'Custom pricing',
      period: 'talk to sales',
      features: [
        'Everything in Professional',
        'Dedicated account manager',
        'Custom integrations',
        'REST API access',
        '99.9% SLA guarantee',
        'Multi-location management',
        'Advanced security & compliance',
        'Premium onboarding',
      ],
    },
  ]

  return (
    <section id="pricing" className="py-20 md:py-32 bg-card/30">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-4">
            Pricing
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Plans for every business size
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you&apos;re ready. No hidden fees.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-8 transition-all duration-300 ${
                plan.popular
                  ? 'border-primary bg-background shadow-xl md:scale-105 relative'
                  : 'border-border bg-background hover:border-border/50 hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  Most popular
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">KES {plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/sign-up"
                className={`block w-full text-center py-3 rounded-lg font-semibold mb-8 transition-all ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border text-foreground hover:bg-secondary'
                }`}
              >
                Get started
              </Link>

              {/* Features */}
              <ul className="space-y-4">
                {plan.features.map((feature, fidx) => (
                  <li key={fidx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-muted-foreground mt-12">
          All plans include 30 days free trial. No credit card required.
        </p>
      </div>
    </section>
  )
}
