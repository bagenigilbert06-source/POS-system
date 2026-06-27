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
    <section id="industries" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-4">
            Industries
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Built for all Kenyan businesses
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you&apos;re running a kiosk, salon, restaurant, or retail chain, 
            BizOS Kenya has you covered
          </p>
        </div>

        {/* Industries grid */}
        <div className="grid md:grid-cols-5 gap-6">
          {industries.map((industry, idx) => {
            const Icon = industry.icon
            return (
              <div
                key={idx}
                className="group rounded-xl border border-border bg-background p-8 text-center hover:bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-300"
              >
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">
                  {industry.name}
                </h3>
                <p className="text-sm text-muted-foreground">
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
