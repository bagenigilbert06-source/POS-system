import { ShoppingCart, UtensilsCrossed, Pill } from 'lucide-react'

const BUSINESS_TYPES = [
  {
    id: 'retail',
    icon: ShoppingCart,
    title: 'Retail',
    description: 'Multi-location inventory management with real-time stock sync',
    benefits: ['Unified inventory', 'Customer profiles', 'Sales analytics'],
  },
  {
    id: 'restaurant',
    icon: UtensilsCrossed,
    title: 'Restaurant & Cafe',
    description: 'Table management, kitchen displays, and order routing',
    benefits: ['Table management', 'Kitchen display', 'Order tracking'],
  },
  {
    id: 'pharmacy',
    icon: Pill,
    title: 'Pharmacy',
    description: 'Prescription management with compliance and record keeping',
    benefits: ['Compliance ready', 'Prescription tracking', 'Insurance integration'],
  },
]

export function BusinessTypesSection() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Built for Your Business Type
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Pre-configured workflows designed specifically for retail, restaurants, and pharmacies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {BUSINESS_TYPES.map((type) => {
            const Icon = type.icon
            return (
              <div
                key={type.id}
                className="rounded-2xl border border-border bg-card p-8 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{type.title}</h3>
                <p className="text-muted-foreground mb-6">{type.description}</p>

                <div className="space-y-2">
                  {type.benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-8 py-3 px-4 rounded-lg border border-primary/30 text-primary font-medium hover:bg-primary/5 transition-colors">
                  Learn more
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
