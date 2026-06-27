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
    title: 'Fast, Reliable Point of Sale',
    description:
      'Process sales quickly, accept cash, card and mobile money, and keep serving customers when connectivity is unstable.',
    tag: 'Core',
    tagClass: 'text-primary bg-primary/8',
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    icon: Package,
    title: 'Real-Time Inventory',
    description:
      'Track stock across products, branches and stores. Set reorder levels, monitor low stock and keep purchasing decisions accurate.',
    tag: 'Core',
    tagClass: 'text-primary bg-primary/8',
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    icon: BarChart3,
    title: 'Actionable Business Analytics',
    description:
      'Understand revenue, margins, slow movers, peak hours, staff performance and branch health without building spreadsheets.',
    tag: 'Insights',
    tagClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    iconClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  },
]

const secondary = [
  { icon: CreditCard,  title: 'Payments & Reconciliation',  description: 'Mobile money, card, invoice and cash payments reconciled into one clean record.' },
  { icon: Users,       title: 'Customer CRM',               description: 'Purchase history, loyalty points, and targeted offers — built right in.' },
  { icon: UserCheck,   title: 'Employees & Roles',          description: 'Shifts, permissions, commissions, and performance tracking for every employee.' },
  { icon: Truck,       title: 'Supplier Management',        description: 'Purchase orders, delivery tracking, and supplier invoice management.' },
  { icon: GitBranch,   title: 'Multi-Branch Control',       description: 'One dashboard for every location. Transfer stock, compare performance and standardize operations.' },
  { icon: Bell,        title: 'Smart Alerts',               description: 'Low stock, expiring products, unusual transactions — notified before it matters.' },
  { icon: Lock,        title: 'Bank-Level Security',        description: 'End-to-end encryption, automatic backups, and full audit trails.' },
  { icon: RefreshCw,   title: 'Auto Reconciliation',        description: 'Every M-Pesa and card transaction matched automatically. Zero manual effort.' },
  { icon: Smartphone,  title: 'Any Device, Anywhere',       description: 'Full experience on desktop, tablet, or mobile. No app installs needed.' },
]

export function LandingFeatures() {
  return (
    <section id="features" className="section-padding-premium bg-secondary">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <p className="section-eyebrow mb-3">Platform Features</p>
          <h2 className="section-heading mb-4">
            Replace every tool with one platform.
          </h2>
          <p className="section-subheading mx-auto">
            Imara brings together the daily systems modern African businesses need to operate, grow, and stay in control.
          </p>
        </div>

        {/* 3 featured cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          {featured.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="fluent-card-hover flex flex-col gap-5 p-7"
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
        <div className="grid overflow-hidden rounded-2xl border border-border bg-border shadow-sm sm:grid-cols-2 md:grid-cols-3">
          {secondary.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group flex items-start gap-4 bg-card p-6 transition-colors duration-150 hover:bg-card/70"
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
