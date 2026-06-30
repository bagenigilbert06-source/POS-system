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
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14 md:mb-16 px-4">
          <p className="section-eyebrow mb-2 sm:mb-3">Why Imara</p>
          <h2 className="section-heading mb-3 sm:mb-4 text-2xl sm:text-4xl md:text-5xl">
            Built different. Built for Africa.
          </h2>
          <p className="section-subheading mx-auto text-sm sm:text-base">
            Other platforms were built elsewhere and retrofitted. Imara was designed from day one for the realities of African commerce.
          </p>
        </div>

        {/* 3-col grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 md:gap-8 px-2 sm:px-0">
          {reasons.map((reason) => {
            const Icon = reason.icon
            return (
              <div key={reason.title} className="flex gap-4 sm:gap-5">
                <div className="shrink-0 h-10 sm:h-11 w-10 sm:w-11 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
                  <Icon className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1 sm:mb-1.5">{reason.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{reason.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
