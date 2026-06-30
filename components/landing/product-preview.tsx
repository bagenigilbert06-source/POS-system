import { Play } from 'lucide-react'

export function ProductPreview() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            See IMARA in Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Watch how IMARA streamlines your entire business workflow in minutes.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
          {/* Placeholder for product screenshot/video */}
          <div className="aspect-video bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center relative overflow-hidden">
            {/* Subtle grid background */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_right,transparent_24%,rgba(68,68,68,.05)_25%,rgba(68,68,68,.05)_26%,transparent_27%,transparent_74%,rgba(68,68,68,.05)_75%,rgba(68,68,68,.05)_76%,transparent_77%,transparent)] bg-[length:4rem_4rem]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_24%,rgba(68,68,68,.05)_25%,rgba(68,68,68,.05)_26%,transparent_27%,transparent_74%,rgba(68,68,68,.05)_75%,rgba(68,68,68,.05)_76%,transparent_77%,transparent)] bg-[length:4rem_4rem]"
            />

            <button className="relative z-10 flex flex-col items-center gap-4 hover:scale-110 transition-transform">
              <div className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center shadow-lg">
                <Play className="h-7 w-7 text-white ml-0.5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Watch Demo (2 min)</span>
            </button>
          </div>
        </div>

        {/* Product features grid below preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Lightning-Fast Checkout',
              description: 'Process transactions in seconds with our optimized interface',
            },
            {
              title: 'Real-Time Dashboard',
              description: 'Monitor sales, inventory, and staff performance live',
            },
            {
              title: 'Multi-Location Management',
              description: 'Control your entire business empire from one place',
            },
          ].map((feature) => (
            <div key={feature.title} className="text-center">
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
