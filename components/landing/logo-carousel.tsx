const integrations = [
  'M-Pesa',
  'Mobile Money',
  'Equity Bank',
  'Tax Ready',
  'KCB',
  'Airtel Money',
  'Co-op Bank',
  'Multi-Branch Retail',
  'Inventory Teams',
  'Finance Teams',
  'Supplier Networks',
]

export function LogoCarousel() {
  const doubled = [...integrations, ...integrations]

  return (
    <section className="overflow-hidden border-y border-border bg-white py-12 dark:bg-background">
      <p className="mb-8 text-center text-sm font-semibold text-slate-950 dark:text-white">
        Trusted by growing businesses across African markets
      </p>
      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-secondary/30 to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-secondary/30 to-transparent z-10 pointer-events-none" />

        <div className="flex gap-3 animate-carousel w-max px-4">
          {doubled.map((name, i) => (
            <div
              key={`${name}-${i}`}
            className="flex shrink-0 items-center justify-center rounded-full border border-border bg-slate-50 px-5 py-2 transition-colors hover:bg-accent/50 dark:bg-slate-950"
            >
              <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
