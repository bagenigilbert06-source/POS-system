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
    <section id="features" className="py-24 md:py-36 bg-gradient-to-b from-background via-background to-primary/2">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="text-center mb-20 md:mb-28">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4 opacity-80">
            Powerful Features
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-5xl font-bold mb-6 tracking-tight">
            Everything you need to run your business
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto font-light">
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
                className="group relative rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 hover:shadow-xl hover:border-primary/40 transition-all duration-300 overflow-hidden"
              >
                {/* Hover background effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-xl bg-primary/12 flex items-center justify-center mb-5 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3 text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-muted-foreground/80 transition-colors">
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
