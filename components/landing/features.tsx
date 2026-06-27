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

const featured = [
  {
    icon: Zap,
    title: 'Lightning-Fast Point of Sale',
    description:
      'Process sales in under 3 seconds. Accept M-Pesa, Airtel Money, card, and cash from one screen. Works offline and syncs automatically when back online.',
    tag: 'Core',
    tagClass: 'text-primary bg-primary/8',
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    icon: Package,
    title: 'Real-Time Inventory Control',
    description:
      'Know exactly what you have, where it is, and when to reorder. Set low-stock alerts, track expiry dates, and manage multiple warehouses from one dashboard.',
    tag: 'Core',
    tagClass: 'text-primary bg-primary/8',
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    icon: BarChart3,
    title: 'Analytics That Work For You',
    description:
      'Revenue trends, top-selling products, slow movers, peak hours, and staff performance — all auto-generated. No spreadsheets, no manual calculations.',
    tag: 'Insights',
    tagClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    iconClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  },
]

const secondary = [
  { icon: CreditCard,  title: 'All Payment Methods',        description: 'M-Pesa, Airtel Money, Visa, Mastercard, and cash. Auto-reconciled at end of day.' },
  { icon: Users,       title: 'Customer CRM',               description: 'Purchase history, loyalty points, and targeted offers — built right in.' },
  { icon: UserCheck,   title: 'Staff & HR',                 description: 'Shifts, commissions, roles, and performance tracking for every employee.' },
  { icon: Truck,       title: 'Supplier Management',        description: 'Purchase orders, delivery tracking, and supplier invoice management.' },
  { icon: GitBranch,   title: 'Multi-Branch Control',       description: 'One dashboard for all locations. Transfer stock, compare performance.' },
  { icon: Bell,        title: 'Smart Alerts',               description: 'Low stock, expiring products, unusual transactions — notified before it matters.' },
  { icon: Lock,        title: 'Bank-Level Security',        description: 'End-to-end encryption, automatic backups, and full audit trails.' },
  { icon: RefreshCw,   title: 'Auto Reconciliation',        description: 'Every M-Pesa and card transaction matched automatically. Zero manual effort.' },
  { icon: Smartphone,  title: 'Any Device, Anywhere',       description: 'Full experience on desktop, tablet, or mobile. No app installs needed.' },
]

export function LandingFeatures() {
  return (
    <section id="features" className="section-padding bg-background">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-eyebrow mb-3">Platform Features</p>
          <h2 className="section-heading mb-4">
            Replace every tool with one platform.
          </h2>
          <p className="section-subheading mx-auto">
            Imara brings together everything a Kenyan business needs to operate, grow, and stay in control — from first sale to end-of-month report.
          </p>
        </div>

        {/* 3 featured cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {featured.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="fluent-card p-7 flex flex-col gap-5 hover:shadow-md-soft hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${f.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 ${f.tagClass}`}>
                    {f.tag}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* 9-cell secondary grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden shadow-sm-soft">
          {secondary.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group flex items-start gap-4 p-6 bg-background hover:bg-secondary/50 transition-colors duration-150"
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
