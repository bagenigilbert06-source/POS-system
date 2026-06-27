import { CreditCard, Zap, BarChart3, Users, Package, GitBranch, Lock, Smartphone, Truck, TrendingUp } from 'lucide-react'

const features = [
  { icon: Zap,         title: 'Point of Sale',      description: 'Fast, reliable checkout that works offline. Process every sale in seconds.' },
  { icon: Package,     title: 'Inventory',           description: 'Real-time stock tracking, low-stock alerts and automated reorder points.' },
  { icon: Users,       title: 'Customers',           description: 'CRM built in — loyalty points, purchase history and smart segments.' },
  { icon: CreditCard,  title: 'Payments',            description: 'M-Pesa, cards and cash. All reconciled automatically at end of day.' },
  { icon: BarChart3,   title: 'Reports',             description: 'Revenue, margin and sales trend reports that actually tell you something.' },
  { icon: TrendingUp,  title: 'Employees',           description: 'Shifts, roles, commissions and performance — all in one place.' },
  { icon: Truck,       title: 'Suppliers',           description: 'Purchase orders, supplier invoices and delivery tracking.' },
  { icon: GitBranch,   title: 'Multi-Branch',        description: 'Manage every location from a single dashboard. No extra tools needed.' },
  { icon: Lock,        title: 'Cloud & Secure',      description: 'Bank-level encryption with automatic daily backups and 99.9% uptime.' },
  { icon: Smartphone,  title: 'Works Anywhere',      description: 'Desktop, tablet or phone — the same full experience on every device.' },
]

export function LandingFeatures() {
  return (
    <section id="features" className="section-padding bg-background">
      <div className="container-wide">
        {/* Header */}
        <div className="max-w-2xl mb-16">
          <p className="section-eyebrow mb-3">Features</p>
          <h2 className="section-heading mb-4">
            Everything your business needs, nothing it does not.
          </h2>
          <p className="section-subheading">
            From first sale to enterprise scale — Imara grows with you.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-border rounded-2xl overflow-hidden fluent-shadow-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group flex flex-col gap-4 p-6 bg-background hover:bg-card transition-colors duration-150"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-150">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
