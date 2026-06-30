import { CheckCircle2 } from 'lucide-react'

const OUTCOMES = [
  {
    outcome: '60% faster checkout',
    description: 'Reduce transaction time from 5 minutes to just 2 minutes',
    result: '+3x throughput per cashier',
  },
  {
    outcome: 'Real-time inventory sync',
    description: 'Automatic stock updates across all locations',
    result: '95% stock accuracy',
  },
  {
    outcome: 'Unified team workspace',
    description: 'All departments on one platform—no fragmentation',
    result: '40% less time on admin',
  },
  {
    outcome: 'Live business intelligence',
    description: 'Dashboard updates every second with actionable insights',
    result: 'Spot trends before competitors',
  },
  {
    outcome: 'Mobile-first design',
    description: 'Manage your business from anywhere, anytime',
    result: 'True business flexibility',
  },
  {
    outcome: 'Enterprise security',
    description: 'Bank-grade encryption and compliance built-in',
    result: 'Sleep soundly at night',
  },
]

export function WhyChooseImara() {
  return (
    <section className="py-20 md:py-28 bg-primary/5 border-y border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Why Choose IMARA
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get measurable results from day one with our unified POS platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {OUTCOMES.map((item) => (
            <div key={item.outcome} className="rounded-xl bg-background border border-border p-8">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{item.outcome}</h3>
                </div>
              </div>
              <p className="text-muted-foreground mb-3 text-sm">{item.description}</p>
              <p className="text-sm font-medium text-primary">{item.result}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
