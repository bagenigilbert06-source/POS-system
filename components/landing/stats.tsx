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
    label: 'Uptime',
    description: 'Always on, always reliable — even offline',
  },
]

export function LandingStats() {
  return (
    <section className="section-dark border-y border-[hsl(var(--section-dark-border))]">
      <div className="container-wide py-14 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px">
          {stats.map((stat, i) => (
            <div
              key={stat.number}
              className={`flex flex-col px-6 py-6 md:py-2 ${i !== 0 ? 'border-l border-[hsl(var(--section-dark-border))] border-opacity-50' : ''} ${i >= 2 ? 'border-t border-[hsl(var(--section-dark-border))] border-opacity-50 md:border-t-0' : ''}`}
            >
              <span className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-1">
                {stat.number}
              </span>
              <span className="text-sm font-semibold text-white/80 mb-1">{stat.label}</span>
              <span className="text-xs text-white/40 leading-relaxed">{stat.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
