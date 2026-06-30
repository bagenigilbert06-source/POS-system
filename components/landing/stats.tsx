const stats = [
  {
    number: '8,500+',
    label: 'Businesses Supported',
    description: 'Retailers, restaurants, pharmacies and service teams',
  },
  {
    number: 'KES 4.2B+',
    label: 'Revenue Processed',
    description: 'Tracked through sales, invoices and payments',
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
      <div className="container-wide section-padding-lg">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.number}
              className="flex flex-col bg-card p-4 sm:p-5 md:p-6"
            >
              <span className="mb-1 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                {stat.number}
              </span>
              <span className="mb-1 text-xs sm:text-sm font-semibold text-foreground">{stat.label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">{stat.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
