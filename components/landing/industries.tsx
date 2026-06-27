'use client'

import { ShoppingCart, Utensils, Dumbbell, Scissors, Pill } from 'lucide-react'

export function LandingIndustries() {
  const industries = [
    {
      icon: ShoppingCart,
      name: 'Retail',
      description: 'From boutiques to supermarkets',
    },
    {
      icon: Utensils,
      name: 'F&B',
      description: 'Restaurants, cafes & catering',
    },
    {
      icon: Dumbbell,
      name: 'Fitness',
      description: 'Gyms and wellness centers',
    },
    {
      icon: Scissors,
      name: 'Salons',
      description: 'Hair, beauty & grooming',
    },
    {
      icon: Pill,
      name: 'Pharmacy',
      description: 'Drugstores and clinics',
    },
  ]

  return (
    <section id="industries" className="py-24 md:py-36 bg-gradient-to-b from-background via-background to-secondary/3">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header - MD3 Typography */}
        <div className="text-center mb-20 md:mb-28">
          <p className="text-md3-label-small text-primary mb-6">
            INDUSTRIES
          </p>
          <h2 className="text-md3-headline-large md:text-md3-display-small mb-8 text-foreground">
            Built for all Kenyan businesses
          </h2>
          <p className="text-md3-body-large text-on-surface-variant max-w-3xl mx-auto">
            Whether you&apos;re running a kiosk, salon, restaurant, or retail chain, 
            IMARA has you covered
          </p>
        </div>

        {/* Industries grid - MD3 Cards */}
        <div className="grid md:grid-cols-5 gap-6">
          {industries.map((industry, idx) => {
            const Icon = industry.icon
            return (
              <div
                key={idx}
                className="group md3-card-elevated rounded-2xl border border-border p-8 text-center elevation-1 hover:elevation-2 transition-all duration-200"
              >
                {/* MD3 Icon container with tonal background */}
                <div className="h-20 w-20 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/25 group-hover:scale-110 transition-all duration-200">
                  <Icon className="h-9 w-9 text-primary" />
                </div>
                
                {/* MD3 Title - Headline Small */}
                <h3 className="text-md3-headline-small mb-3 text-foreground">
                  {industry.name}
                </h3>
                
                {/* MD3 Description - Body Small */}
                <p className="text-md3-body-medium text-on-surface-variant">
                  {industry.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
