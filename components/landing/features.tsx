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
    <section id="features" className="py-28 md:py-40 bg-gradient-to-b from-background via-background to-primary/2">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header - MD3 Typography */}
        <div className="text-center mb-24 md:mb-32">
          <p className="text-md3-label-small text-primary mb-6 opacity-90">
            POWERFUL FEATURES
          </p>
          <h2 className="text-md3-headline-large md:text-md3-display-small mb-8 text-foreground">
            Everything you need to run your business
          </h2>
          <p className="text-md3-body-large text-on-surface-variant max-w-3xl mx-auto">
            Powerful features designed specifically for Kenyan entrepreneurs, 
            from single kiosks to large retail chains
          </p>
        </div>

        {/* Features grid - MD3 Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className="group md3-card-elevated rounded-3xl border border-border overflow-hidden hover:elevation-3 transition-all duration-200"
              >
                {/* MD3 Tonal background for hover state */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                
                <div className="relative z-10 p-8">
                  {/* MD3 Icon container with tonal background */}
                  <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-6 group-hover:bg-primary/25 group-hover:scale-110 transition-all duration-200">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  
                  {/* MD3 Title - Headline Small */}
                  <h3 className="text-md3-headline-small mb-3 text-foreground group-hover:text-primary transition-colors duration-200">
                    {feature.title}
                  </h3>
                  
                  {/* MD3 Description - Body Small */}
                  <p className="text-md3-body-medium text-on-surface-variant leading-relaxed">
                    {feature.description}
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
