const stats = [
  { number: '5,000+', label: 'Businesses', description: 'Active across Kenya' },
  { number: '50M+',   label: 'Transactions', description: 'Processed monthly' },
  { number: 'KES 2B+', label: 'Revenue tracked', description: 'Annually on platform' },
  { number: '99.9%',  label: 'Uptime', description: 'SLA guarantee' },
]

export function LandingStats() {
  return (
    <section className="border-y border-border bg-card/40">
      <div className="container-wide py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-border">
          {stats.map((stat) => (
            <div key={stat.number} className="flex flex-col items-center md:items-start md:px-8 first:md:pl-0 last:md:pr-0 gap-1">
              <span className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {stat.number}
              </span>
              <span className="text-sm font-semibold text-foreground">{stat.label}</span>
              <span className="text-xs text-muted-foreground">{stat.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
