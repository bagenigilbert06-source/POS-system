const stats = [
  {
    number: '8,500+',
    label: 'Businesses',
    description: 'Retailers, restaurants, pharmacies and services across Africa',
  },
  {
    number: 'KES 4.2B+',
    label: 'Revenue Processed',
    description: 'Tracked through sales, invoices and payments on the platform',
  },
  {
    number: '72M+',
    label: 'Transactions',
    description: 'Sales, payments and stock movements recorded',
  },
  {
    number: '99.9%',
    label: 'Uptime',
    description: 'Reliable cloud access with offline-ready workflows',
  },
]

export function LandingStats() {
  return (
    <section className="border-y border-border bg-background">
      <div className="container-wide py-16 md:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border shadow-sm-soft">
          {stats.map((stat) => (
            <div key={stat.number} className="flex flex-col bg-card p-6 md:p-8">
              <span className="mb-2 text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-none">
                {stat.number}
              </span>
              <span className="mb-2 text-sm font-semibold text-foreground">{stat.label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{stat.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
