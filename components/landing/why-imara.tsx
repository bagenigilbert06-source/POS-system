import { X, Check } from 'lucide-react'

const before = [
  'Managing inventory on notebooks and spreadsheets',
  'Spending 2+ hours on end-of-day reconciliation',
  'No idea which products are actually profitable',
  'Can\'t see what\'s happening at your other branches',
  'Losing customers because loyalty programmes are manual',
  'Making purchasing decisions on guesswork',
]

const after = [
  'Real-time inventory across every product and branch',
  'End-of-day closes automatically — in under 15 minutes',
  'Instant P&L with margins on every product',
  'All branches visible from one screen on your phone',
  'Built-in loyalty programme that runs itself',
  'Reorder alerts fire before you run out of stock',
]

const outcomes = [
  { metric: 'Save', value: '10+ hrs', description: 'per week on admin and reconciliation' },
  { metric: 'Know', value: '100%', description: 'of what\'s in stock at all times' },
  { metric: 'Grow', value: '3×', description: 'faster with data-driven decisions' },
  { metric: 'Manage', value: 'Any', description: 'number of branches from one dashboard' },
]

export function LandingWhyImara() {
  return (
    <section id="why-imara" className="section-padding-premium bg-background border-b border-border">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
          <p className="section-eyebrow mb-3">The Transformation</p>
          <h2 className="section-heading mb-5 text-3xl md:text-4xl lg:text-5xl leading-tight text-balance">
            Your business, before and after IMARA.
          </h2>
          <p className="section-subheading text-balance">
            Every growing business reaches a point where chaos sets in. IMARA replaces that chaos with clarity.
          </p>
        </div>

        {/* Before / After */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-14 md:mb-16">
          {/* Before */}
          <div className="rounded-2xl border border-border bg-secondary p-7 md:p-8">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <X className="h-4 w-4 text-destructive" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground">Before IMARA</h3>
            </div>
            <ul className="space-y-3.5">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-destructive/70 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-7 md:p-8">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground">With IMARA</h3>
            </div>
            <ul className="space-y-3.5">
              {after.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Outcome metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {outcomes.map((o) => (
            <div key={o.metric} className="text-center p-6 rounded-2xl border border-border bg-card">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{o.metric}</p>
              <p className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-2">{o.value}</p>
              <p className="text-sm text-muted-foreground leading-snug">{o.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
