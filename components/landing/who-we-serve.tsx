'use client'

import { ShoppingCart, UtensilsCrossed, Pill } from 'lucide-react'

export function WhoWeServe() {
  const segments = [
    {
      id: 'retail',
      name: 'Retail Stores',
      description: 'From boutiques to supermarkets, streamline sales and inventory',
      icon: ShoppingCart,
      color: 'bg-blue-50 text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      id: 'restaurants',
      name: 'Restaurants & Cafes',
      description: 'Fast service, accurate orders, happy customers',
      icon: UtensilsCrossed,
      color: 'bg-orange-50 text-orange-600',
      borderColor: 'border-orange-200',
    },
    {
      id: 'pharmacy',
      name: 'Pharmacies',
      description: 'Secure compliance, inventory tracking, customer care',
      icon: Pill,
      color: 'bg-emerald-50 text-emerald-600',
      borderColor: 'border-emerald-200',
    },
  ]

  return (
    <section className="py-20 md:py-32 px-4 md:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Built for your business
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you run a store, restaurant, or pharmacy, IMARA adapts to your needs
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {segments.map((segment) => {
            const Icon = segment.icon
            return (
              <div
                key={segment.id}
                className={`p-8 rounded-lg border ${segment.borderColor} ${segment.color} hover:shadow-lg transition-shadow duration-300`}
              >
                <div className="mb-4">
                  <Icon className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {segment.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {segment.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
