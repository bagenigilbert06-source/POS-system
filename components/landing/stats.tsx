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
    <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-wide py-16 md:py-24">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm md:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
          {stats.map((stat, i) => (
            <div
              key={stat.number}
              className="flex flex-col bg-white p-6 dark:bg-slate-950"
            >
              <span className="mb-1 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl dark:text-white">
                {stat.number}
              </span>
              <span className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{stat.label}</span>
              <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{stat.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
