'use client'

import { Lock, Cloud, Smartphone, Shield, Wifi, Users } from 'lucide-react'

export function TrustSignals() {
  const signals = [
    {
      id: 'security',
      title: 'Bank-grade Security',
      description: 'SSL encryption, PCI compliant, your data is protected',
      icon: Lock,
    },
    {
      id: 'cloud',
      title: 'Cloud Backup',
      description: 'Automatic daily backups, never lose your data',
      icon: Cloud,
    },
    {
      id: 'mobile',
      title: 'Works Everywhere',
      description: 'Desktop, tablet, phone - one synchronized system',
      icon: Smartphone,
    },
    {
      id: 'compliance',
      title: 'Compliance Ready',
      description: 'Built for regulatory requirements in Africa',
      icon: Shield,
    },
    {
      id: 'offline',
      title: 'Offline Mode',
      description: 'Keep selling even when internet goes down',
      icon: Wifi,
    },
    {
      id: 'permissions',
      title: 'Team Control',
      description: 'Role-based access, manager approval workflows',
      icon: Users,
    },
  ]

  return (
    <section className="py-20 md:py-32 px-4 md:px-6 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Built for trust
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enterprise-grade reliability for businesses of any size
          </p>
        </div>

        {/* Trust signals grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {signals.map((signal) => {
            const Icon = signal.icon
            return (
              <div key={signal.id} className="flex flex-col">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {signal.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {signal.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
