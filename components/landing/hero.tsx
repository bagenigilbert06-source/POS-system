import Link from 'next/link'
import {
  ArrowRight,
  Check,
  TrendingUp,
} from 'lucide-react'

function OrderDashboardPreview() {
  return (
    <div className="w-full rounded-xl border border-border bg-card shadow-lg-soft overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-secondary/40 border-b border-border">
        <span className="h-2 w-2 rounded-full bg-red-500/70" />
        <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
        <span className="h-2 w-2 rounded-full bg-green-500/70" />
        <div className="mx-auto flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground flex-1 ml-4">
          <span className="h-1 w-1 rounded-full bg-cyan-500" />
          app.possystem.io/orders
        </div>
      </div>

      <div className="p-4 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Incoming orders</p>
            <p className="text-sm font-bold text-foreground">89 Orders</p>
          </div>
          <div className="flex gap-2">
            {[
              { emoji: '🛍️', label: 'Shopify' },
              { emoji: '🟠', label: 'Amazon' },
              { emoji: '🔵', label: 'eBay' },
              { emoji: '⭐', label: '100+' },
            ].map((item, i) => (
              <div key={i} className="h-6 w-6 rounded-lg bg-secondary flex items-center justify-center text-xs">
                {item.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Orders table preview */}
        <div className="space-y-2">
          {[
            { status: '✓', status_text: 'Ready to ship', id: 'ORD-8521', channel: 'Shopify', flag: '🇬🇧' },
            { status: '✓', status_text: 'Ready to ship', id: 'ORD-8520', channel: 'Amazon', flag: '🇩🇪' },
            { status: '✓', status_text: 'Ready to ship', id: 'ORD-8519', channel: 'eBay', flag: '🇳🇱' },
            { status: '✓', status_text: 'Ready to ship', id: 'ORD-8518', channel: 'Shopify', flag: '🇫🇷' },
            { status: '✓', status_text: 'Ready to ship', id: 'ORD-8517', channel: 'Amazon', flag: '🇬🇧' },
          ].map((order, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/40 border border-border/50 hover:bg-secondary/60 transition-colors text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">{order.status}</span>
                <span className="text-muted-foreground truncate">{order.status_text}</span>
              </div>
              <div className="flex items-center justify-end gap-2 ml-2 flex-1">
                <span className="font-mono text-foreground">{order.id}</span>
                <span className="text-muted-foreground">{order.channel}</span>
                <span className="text-lg">{order.flag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <section className="relative bg-background overflow-hidden">
      <div className="container-wide relative py-16 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div className="flex flex-col">
            <div className="inline-flex self-start items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/8 px-4 py-2 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 tracking-wide">
                Trusted by 10,000+ businesses
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.15] text-balance mb-6 text-foreground">
              The complete platform for{' '}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                modern businesses
              </span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-4 text-pretty">
              Manage orders, inventory, customers, and analytics in one beautifully simple system. Connect with all your sales channels and grow without limits.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-10">
              <Link href="/sign-up" className="fluent-btn-primary px-8 py-3.5 text-base font-semibold rounded-lg">
                Start for free
              </Link>
              <Link href="#features" className="px-8 py-3.5 text-base font-semibold text-cyan-600 dark:text-cyan-400 border-2 border-cyan-500/30 rounded-lg hover:bg-cyan-500/5 transition-colors">
                Talk to an expert
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                '14-day free trial',
                'Transparent pricing',
                'Setup in minutes',
                'Cancel anytime',
              ].map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-cyan-500 shrink-0 stroke-[3]" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard preview */}
          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-8 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl blur-2xl pointer-events-none" />
            <OrderDashboardPreview />
          </div>
        </div>

        {/* Trust section */}
        <div className="mt-20 pt-12 border-t border-border">
          <p className="text-center text-muted-foreground mb-8">
            <span className="font-semibold text-foreground">30,000+ businesses</span> use our platform to grow
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {[
              { emoji: '🛍️', name: 'Shopify' },
              { emoji: '🟠', name: 'Amazon' },
              { emoji: '🔵', name: 'eBay' },
              { emoji: '📦', name: 'WooCommerce' },
              { emoji: '⭐', name: '100+ more' },
            ].map((brand, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/40 border border-border/50 hover:border-border transition-colors">
                <span className="text-2xl">{brand.emoji}</span>
                <span className="text-sm font-medium text-muted-foreground">{brand.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
