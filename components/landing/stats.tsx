const stats = [
  {
    number: '5,000+',
    label: 'Active Businesses',
    description: 'Across Kenya — from Nairobi to Mombasa to Kisumu',
  },
  {
    number: 'KES 2B+',
    label: 'Revenue Processed',
    description: 'Every month through the Imara platform',
  },
  {
    number: '50M+',
    label: 'Transactions',
    description: 'Sales, payments and stock movements monthly',
  },
  {
    number: '99.9%',
    label: 'Platform Uptime',
    description: 'Always on, always reliable — even offline',
  },
]

export function LandingStats() {
  return (
    <section className="bg-foreground">
      <div className="container-wide py-14 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 divide-y md:divide-y-0">
          {stats.map((stat, i) => (
            <div
              key={stat.number}
              className={`flex flex-col px-8 py-6 md:py-0 ${i === 0 ? 'pl-0' : ''} ${i === stats.length - 1 ? 'pr-0' : ''}`}
            >
              <span className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-1">
                {stat.number}
              </span>
              <span className="text-sm font-semibold text-white/80 mb-1">{stat.label}</span>
              <span className="text-xs text-white/45 leading-relaxed">{stat.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
