const integrations = [
  { name: 'M-Pesa',       color: 'text-green-700 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800' },
  { name: 'Safaricom',    color: 'text-green-700 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-800' },
  { name: 'Equity Bank',  color: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800' },
  { name: 'KRA',          color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800' },
  { name: 'KCB',          color: 'text-blue-800 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800' },
  { name: 'Airtel Money', color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800' },
  { name: 'Co-op Bank',   color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
  { name: 'NCBA',         color: 'text-slate-700 dark:text-slate-300',   bg: 'bg-slate-50 dark:bg-slate-800/40',   border: 'border-slate-200 dark:border-slate-700' },
  { name: 'DTB',          color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' },
  { name: 'Stanbic',      color: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20',     border: 'border-blue-200 dark:border-blue-800' },
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
          {doubled.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className={`shrink-0 flex items-center justify-center rounded-full border px-5 py-2 shadow-sm-soft ${item.bg} ${item.border}`}
            >
              <span className={`text-xs font-bold whitespace-nowrap ${item.color}`}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
