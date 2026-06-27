const integrations = [
  'M-Pesa',
  'Safaricom',
  'Equity Bank',
  'KRA',
  'KCB',
  'Airtel Money',
  'Co-op Bank',
  'NCBA',
  'DTB',
  'Stanbic',
]

export function LogoCarousel() {
  const doubled = [...integrations, ...integrations]

  return (
    <section className="py-12 border-y border-border overflow-hidden bg-secondary/30">
      <p className="text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-8">
        Integrated with Kenya&apos;s leading payment &amp; banking platforms
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
              className="shrink-0 flex items-center justify-center rounded-full border border-border bg-card px-5 py-2 hover:bg-accent/50 transition-colors"
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
