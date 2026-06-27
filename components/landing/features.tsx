import {
  Zap,
  Package,
  Users,
  CreditCard,
  BarChart3,
  UserCheck,
  Truck,
  GitBranch,
  Lock,
  Smartphone,
  Bell,
  RefreshCw,
} from 'lucide-react'

// Large featured modules — shown in the bento top row
const featured = [
  {
    icon: Zap,
    title: 'Lightning-Fast Point of Sale',
    description:
      'Process sales in under 3 seconds. Accept cash, M-Pesa, Airtel Money, and cards from one screen. Works offline — syncs automatically when back online.',
    tag: 'Core',
  },
  {
    icon: Package,
    title: 'Real-Time Inventory',
    description:
      'Know exactly what you have, where it is, and when to reorder. Set low-stock alerts, track expiry dates, and manage multiple warehouses from one place.',
    tag: 'Core',
  },
  {
    icon: BarChart3,
    title: 'Analytics That Actually Help',
    description:
      'Revenue trends, top-selling products, slow movers, peak hours, and staff performance — all auto-generated. No spreadsheets, no manual work.',
    tag: 'Insights',
  },
]

// Secondary grid of features
const secondary = [
  {
    icon: CreditCard,
    title: 'All Payment Methods',
    description: 'M-Pesa, Airtel Money, Visa, Mastercard, and cash. One reconciliation at end of day.',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    description: 'Purchase history, loyalty points, and targeted offers — built right in.',
  },
  {
    icon: UserCheck,
    title: 'Staff & HR',
    description: 'Shifts, commissions, roles, and performance tracking for every employee.',
  },
  {
    icon: Truck,
    title: 'Supplier Management',
    description: 'Purchase orders, delivery tracking, and supplier invoice management.',
  },
  {
    icon: GitBranch,
    title: 'Multi-Branch Control',
    description: 'One dashboard for all your locations. Transfer stock, compare performance.',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Low stock, expiring products, unusual transactions — you know before it matters.',
  },
  {
    icon: Lock,
    title: 'Bank-Level Security',
    description: 'End-to-end encryption, automatic backups, and full audit trails.',
  },
  {
    icon: RefreshCw,
    title: 'Automatic Reconciliation',
    description: 'Every M-Pesa and card transaction matched and reconciled. Zero manual effort.',
  },
  {
    icon: Smartphone,
    title: 'Any Device, Anywhere',
    description: 'Same full experience on desktop, tablet, or mobile. No app installs needed.',
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="section-padding bg-background">
      <div className="container-wide">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <p className="section-eyebrow mb-3">Platform Features</p>
          <h2 className="section-heading mb-4">
            Replace every tool you use with one platform.
          </h2>
          <p className="section-subheading">
            Imara brings together everything a Kenyan business needs to operate, grow, and stay in control — from the first sale to the end-of-month report.
          </p>
        </div>

        {/* Bento top row — 3 featured cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {featured.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="fluent-card p-7 flex flex-col gap-5 hover:fluent-shadow-8 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 rounded-full px-2.5 py-1">
                    {f.tag}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Secondary 9-cell grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden fluent-shadow-4">
          {secondary.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group flex items-start gap-4 p-6 bg-background hover:bg-card transition-colors duration-150"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-150 mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
