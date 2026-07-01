import {
  Zap,
  Package,
  Users,
  CreditCard,
  MessageCircle,
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
    icon: MessageCircle,
    title: 'WhatsApp Integration',
    description:
      'Send receipts, order confirmations, and payment updates directly to customers via WhatsApp. Built-in messaging for customer engagement.',
    tag: 'Engagement',
    tagClass: 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    iconClass: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
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
    <section id="features" className="section-padding-premium border-b border-border bg-[#eef2e8]">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-16 md:mb-20 px-3 sm:px-4">
          <p className="section-eyebrow mb-2 sm:mb-3 text-xs sm:text-sm">Platform Features</p>
          <h2 className="section-heading mb-3 sm:mb-4 text-2xl sm:text-4xl md:text-5xl leading-tight">
            Replace every tool with one platform.
          </h2>
          <p className="section-subheading mx-auto text-xs sm:text-base leading-relaxed">
            Imara brings together the daily systems modern African businesses need to operate, grow, and stay in control.
          </p>
        </div>

        {/* 3 featured cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 mb-3 sm:mb-5 px-3 sm:px-0">
          {featured.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 shadow-sm transition-all duration-150 hover:border-[#b8c9b5] hover:shadow-md sm:gap-5 sm:p-6 md:p-7"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`h-10 sm:h-11 w-10 sm:w-11 rounded-md flex items-center justify-center flex-shrink-0 ${f.iconClass}`}>
                    <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
                  </div>
                  <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 flex-shrink-0 ${f.tagClass}`}>
                    {f.tag}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground mb-1 sm:mb-2 leading-snug">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* 9-cell secondary grid */}
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border shadow-sm grid-cols-1 sm:grid-cols-2 md:grid-cols-3 px-3 sm:px-0">
          {secondary.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group flex items-start gap-3 bg-card p-3 sm:p-5 md:p-6 transition-colors duration-150 hover:bg-card/70"
              >
                <div className="h-8 sm:h-9 w-8 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-150 mt-0.5">
                  <Icon className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-0.5 sm:mb-1 leading-snug">{f.title}</h3>
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
