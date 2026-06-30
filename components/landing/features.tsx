import {
  ShoppingCart,
  Package,
  Users,
  Truck,
  DollarSign,
  BarChart2,
  GitBranch,
  UserCheck,
  Zap,
} from 'lucide-react'

const pillars = [
  {
    icon: ShoppingCart,
    title: 'Run Sales',
    description:
      'Fast, reliable point of sale. Accept cash, card, and mobile money. Never slow down at the counter.',
    outcomes: ['Complete a sale in under 5 seconds', 'Accept M-Pesa, card & cash', 'Works offline when needed'],
    featured: true,
  },
  {
    icon: Package,
    title: 'Manage Inventory',
    description:
      'Know exactly what you have, where it is, and when to reorder. Zero spreadsheets required.',
    outcomes: ['Real-time stock across branches', 'Low stock alerts & reorder points', 'Expiry tracking for perishables'],
    featured: true,
  },
  {
    icon: Users,
    title: 'Know Your Customers',
    description:
      'Build lasting relationships with a built-in CRM, loyalty points, and purchase history.',
    outcomes: ['Full customer purchase history', 'Loyalty programme out of the box', 'Targeted promotions & offers'],
    featured: true,
  },
  {
    icon: Truck,
    title: 'Manage Purchasing',
    description:
      'Streamline your supply chain from purchase orders to supplier invoices.',
    outcomes: ['Raise and track purchase orders', 'Supplier management & history', 'Automatic reorder triggers'],
    featured: false,
  },
  {
    icon: DollarSign,
    title: 'Track Finances',
    description:
      'Automatic reconciliation. Know your revenue, costs, and margins at a glance.',
    outcomes: ['Daily P&L automatically generated', 'M-Pesa & card auto-reconciliation', 'Invoice & payment tracking'],
    featured: false,
  },
  {
    icon: UserCheck,
    title: 'Manage Employees',
    description:
      'Shifts, roles, commissions, and performance — all in one place for your whole team.',
    outcomes: ['Role-based access controls', 'Shift scheduling & time tracking', 'Sales commission management'],
    featured: false,
  },
  {
    icon: GitBranch,
    title: 'Multi-Branch Control',
    description:
      'Expand with confidence. One dashboard for every location, with centralized reporting.',
    outcomes: ['Unified view of all branches', 'Stock transfers between locations', 'Per-branch performance reports'],
    featured: false,
  },
  {
    icon: BarChart2,
    title: 'See Everything',
    description:
      'Analytics and reports that surface the numbers that matter — daily, weekly, and monthly.',
    outcomes: ['Top products & slow movers', 'Peak hours & busy periods', 'Staff performance dashboards'],
    featured: false,
  },
  {
    icon: Zap,
    title: 'Business Automation',
    description:
      'Set rules that run your business while you focus on growth. Automated alerts, actions, and workflows.',
    outcomes: ['Low-stock auto-alerts', 'Reorder trigger automation', 'Scheduled reports via WhatsApp'],
    featured: false,
  },
]

export function LandingFeatures() {
  const featuredPillars = pillars.filter((p) => p.featured)
  const restPillars = pillars.filter((p) => !p.featured)

  return (
    <section id="features" className="section-padding-premium bg-background border-b border-border">
      <div className="container-wide">
        {/* Header */}
        <div className="max-w-2xl mb-16 md:mb-20">
          <p className="section-eyebrow mb-3">The Platform</p>
          <h2 className="section-heading mb-5 text-3xl md:text-4xl lg:text-5xl leading-tight">
            Every tool your business needs.{' '}
            <span className="text-muted-foreground">Nothing it doesn&apos;t.</span>
          </h2>
          <p className="section-subheading">
            IMARA replaces the disconnected apps, spreadsheets, and manual processes holding your business back — with one unified Business OS.
          </p>
        </div>

        {/* 3 featured pillars — large cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {featuredPillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.title}
                className="fluent-card p-7 flex flex-col gap-6 hover:border-primary/30 transition-colors duration-200"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.description}</p>
                </div>
                <ul className="mt-auto space-y-2">
                  {pillar.outcomes.map((o) => (
                    <li key={o} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* 6 remaining pillars — compact grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {restPillars.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.title}
                className="group flex items-start gap-4 bg-card p-6 hover:bg-secondary/50 transition-colors duration-150"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-150 mt-0.5">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-1.5 leading-snug">{pillar.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{pillar.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
