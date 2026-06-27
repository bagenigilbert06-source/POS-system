const integrations = [
  'M-Pesa', 'Safaricom', 'Equity Bank', 'KRA', 'Co-op Bank',
  'Airtel Money', 'Stanbic Bank', 'NCBA', 'DTB', 'KCB',
]

export function LogoCarousel() {
  // Duplicate for seamless infinite scroll
  const items = [...integrations, ...integrations]

  return (
    <section className="py-12 border-y border-border bg-card/20 overflow-hidden">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-8">
        Integrated with Kenya&apos;s leading payment & banking platforms
      </p>
      <div className="relative">
        <div className="flex gap-8 animate-[scroll_28s_linear_infinite] w-max">
          {items.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="shrink-0 flex items-center justify-center rounded-xl border border-border bg-background px-7 py-3 fluent-shadow-2"
            >
              <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">{name}</span>
            </div>
          ))}
        </div>
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-card/20 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-card/20 to-transparent pointer-events-none" />
      </div>

      <style jsx>{`
        @keyframes scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  )
}
