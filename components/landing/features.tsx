'use client'

import { CreditCard, Zap, BarChart3, Users, Package, TrendingUp, Lock, Smartphone } from 'lucide-react'

export function LandingFeatures() {
  const features = [
    {
      icon: CreditCard,
      title: 'M-Pesa Payments',
      description: 'Accept M-Pesa payments instantly without middlemen',
    },
    {
      icon: Zap,
      title: 'Lightning Fast POS',
      description: 'Process sales in milliseconds with our cloud-based terminal',
    },
    {
      icon: Package,
      title: 'Smart Inventory',
      description: 'Real-time stock tracking and automated low-stock alerts',
    },
    {
      icon: Users,
      title: 'Customer Loyalty',
      description: 'Build customer relationships with loyalty programs',
    },
    {
      icon: BarChart3,
      title: 'Advanced Reports',
      description: 'Understand your business with deep analytics and insights',
    },
    {
      icon: TrendingUp,
      title: 'Sales Growth',
      description: 'Proven tools to help your business grow faster',
    },
    {
      icon: Lock,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and compliance standards',
    },
    {
      icon: Smartphone,
      title: 'Works Everywhere',
      description: 'Desktop, tablet, and mobile - seamless experience',
    },
  ]

  return (
    <section id="features" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-4">
            Features
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything you need to run your business
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed specifically for Kenyan entrepreneurs, 
            from single kiosks to large retail chains
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className="group rounded-xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
