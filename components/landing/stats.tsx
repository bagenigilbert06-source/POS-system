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
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-sm grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.number}
              className="flex flex-col bg-card p-4 sm:p-4 md:p-5 lg:p-6"
            >
              <span className="mb-1 text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
                {stat.number}
              </span>
              <span className="mb-1 text-xs sm:text-xs md:text-sm font-semibold text-foreground line-clamp-2">{stat.label}</span>
              <span className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground">{stat.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
