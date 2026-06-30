'use client'

import { Zap, BarChart3, Lock, Cloud } from 'lucide-react'

export function OutcomesFeatures() {
  const outcomes = [
    {
      id: 'faster-sales',
      title: 'Sell Faster',
      description: 'Quick checkout, multiple payment methods, offline mode keeps you selling even without internet',
      icon: Zap,
    },
    {
      id: 'inventory',
      title: 'Manage Inventory',
      description: 'Real-time stock updates, automated reordering alerts, prevent stockouts and overstock',
      icon: BarChart3,
    },
    {
      id: 'insights',
      title: 'Know Your Business',
      description: 'Sales trends, customer patterns, revenue reports - understand what drives growth',
      icon: Lock,
    },
    {
      id: 'trust',
      title: 'Grow with Confidence',
      description: 'Your data is secure, backed up automatically, and accessible anywhere',
      icon: Cloud,
    },
  ]

  return (
    <section className="py-20 md:py-32 px-4 md:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Everything you need to run your business
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Focused features that matter, not a bloated feature list
          </p>
        </div>

        {/* Four outcome cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {outcomes.map((outcome) => {
            const Icon = outcome.icon
            return (
              <div key={outcome.id} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {outcome.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {outcome.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
