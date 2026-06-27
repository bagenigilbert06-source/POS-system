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
    <section className="py-20 md:py-28 border-y border-outline/15 bg-gradient-to-r from-background via-primary/2 to-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center md:text-left group">
              {/* MD3 Display Large for numbers */}
              <div className="text-md3-display-small md:text-md3-display-medium text-foreground mb-3 group-hover:text-primary transition-colors duration-200">
                {stat.number}
              </div>
              {/* MD3 Body Medium for description */}
              <p className="text-md3-body-medium text-on-surface-variant">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
