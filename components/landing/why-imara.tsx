import { Zap, Eye, CloudCog, ShieldCheck, BarChart2, GitBranch } from 'lucide-react'

const reasons = [
  {
    icon: Zap,
    title: 'Fast Checkout',
    description: 'Complete a sale in under 5 seconds. Built for high-volume retail environments where every second counts.',
  },
  {
    icon: Eye,
    title: 'Real-Time Inventory',
    description: 'Know exactly what is in stock at every branch the moment a sale happens. No spreadsheets needed.',
  },
  {
    icon: BarChart2,
    title: 'Business Insights',
    description: 'Daily, weekly and monthly reports that surface the numbers that matter — automatically.',
  },
  {
    icon: CloudCog,
    title: 'Cloud-Based',
    description: 'Access your business from anywhere. Auto-syncs across all devices with zero setup.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Compliant',
    description: 'End-to-end encryption, role-based access controls and full audit logs on every action.',
  },
  {
    icon: GitBranch,
    title: 'Multi-Branch Ready',
    description: 'Open a new location in minutes. Centralized reporting, inventory and staff management.',
  },
]

export function LandingWhyImara() {
  return (
    <section id="why-imara" className="section-padding-premium bg-secondary">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="section-eyebrow mb-3">Why Imara</p>
          <h2 className="section-heading mb-4">
            Built different. Built for Africa.
          </h2>
          <p className="section-subheading mx-auto">
            Other platforms were built elsewhere and retrofitted. Imara was designed from day one for the realities of African commerce.
          </p>
        </div>

        {/* 3-col grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((reason) => {
            const Icon = reason.icon
            return (
              <div key={reason.title} className="flex gap-5">
                <div className="shrink-0 h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1.5">{reason.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{reason.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
