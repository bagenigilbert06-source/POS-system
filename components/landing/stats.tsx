export function LandingStats() {
  const stats = [
    {
      number: '5,000+',
      description: 'Kenyan businesses using Nexora',
    },
    {
      number: '99.9%',
      description: 'Uptime guarantee',
    },
    {
      number: '50M+',
      description: 'Transactions processed monthly',
    },
    {
      number: 'KES 2B+',
      description: 'Processed annually',
    },
  ]

  return (
    <section className="py-16 md:py-24 border-y border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center md:text-left">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                {stat.number}
              </div>
              <p className="text-sm md:text-base text-muted-foreground">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
