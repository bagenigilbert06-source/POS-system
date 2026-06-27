import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Package,
  CreditCard,
  Users,
  Zap,
  BarChart3,
  ShieldCheck,
} from 'lucide-react'

function DashboardMockup() {
  return (
    <div className="w-full rounded-2xl border border-border bg-card shadow-xl-soft overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-secondary/60 border-b border-border">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <div className="mx-auto flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground w-44">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          app.imara.co/dashboard
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-12 shrink-0 bg-[hsl(var(--section-dark-bg))] flex flex-col items-center py-4 gap-4">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white fill-white" />
          </div>
          {[BarChart3, Package, CreditCard, Users, ShieldCheck].map((Icon, i) => (
            <div
              key={i}
              className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                i === 0 ? 'bg-primary/25' : ''
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${i === 0 ? 'text-primary' : 'text-white/30'}`} />
            </div>
          ))}
        </div>

        {/* Main area */}
        <div className="flex-1 p-4 bg-background min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-muted-foreground">Good morning</p>
              <p className="text-xs font-bold text-foreground">Jane Wanjiku</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Live
            </span>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Today's Sales", value: 'KES 48,250', badge: '+12%', green: true },
              { label: 'Transactions', value: '284', badge: '+8%', green: true },
              { label: 'Low Stock', value: '3 items', badge: 'Alert', green: false },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-border bg-card p-2.5">
                <p className="text-[9px] text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{kpi.value}</p>
                <p className={`text-[9px] font-semibold mt-1 ${kpi.green ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {kpi.badge}
                </p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-border bg-card p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-foreground">Revenue Trends</p>
              <p className="text-[9px] text-muted-foreground">Last 30 days</p>
            </div>
            <div className="h-16 flex items-end gap-1">
              {[30, 45, 38, 58, 48, 68, 62, 80, 72, 88, 82, 95].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm overflow-hidden bg-primary/10" style={{ height: `${h}%` }}>
                  <div className="w-full bg-primary/70 rounded-t-sm" style={{ height: `${h * 0.65}%`, marginTop: 'auto' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div className="rounded-xl border border-border bg-card p-2.5">
            <p className="text-[10px] font-semibold text-foreground mb-2">Recent Sales</p>
            <div className="space-y-1.5">
              {[
                { name: 'Unga Pembe 2kg', amount: 'KES 180', ok: true },
                { name: 'Cooking Oil 1L', amount: 'KES 320', ok: true },
                { name: 'Sugar × 5', amount: 'KES 750', ok: true },
              ].map((tx) => (
                <div key={tx.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <TrendingUp className="h-2.5 w-2.5 text-primary shrink-0" />
                    <p className="text-[9px] text-foreground truncate">{tx.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <p className="text-[9px] font-semibold text-foreground">{tx.amount}</p>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <section className="relative bg-background overflow-hidden">
      {/* Dot grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="container-wide relative pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — copy */}
          <div className="flex flex-col">
            <div className="inline-flex self-start items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary tracking-wide">
                Kenya&apos;s #1 Business OS &mdash; 5,000+ active businesses
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.1] text-balance mb-6">
              Run your entire{' '}
              <span className="text-primary">business</span>{' '}
              from one screen.
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-3 text-pretty">
              Imara replaces your POS, inventory, customer records, staff management, supplier tracking, and financial reports — with one beautifully simple cloud platform built for Kenyan businesses.
            </p>

            <p className="text-sm text-muted-foreground mb-8">
              Used by supermarkets, salons, restaurants, pharmacies, hardware stores &amp; wholesalers across Kenya.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3 mb-8">
              <Link href="/sign-up" className="fluent-btn-primary px-7 py-3.5 text-sm">
                Start Free &mdash; No Card Needed
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#features" className="fluent-btn-secondary px-7 py-3.5 text-sm">
                See How It Works
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
              {[
                '30-day free trial',
                'No credit card required',
                'Setup in under 2 hours',
                'Cancel anytime',
              ].map((t) => (
                <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Right — code dashboard */}
          <div className="relative lg:pl-4">
            <div aria-hidden="true" className="absolute -inset-6 bg-primary/5 rounded-3xl blur-3xl pointer-events-none" />
            <DashboardMockup />

            {/* Floating trust badge */}
            <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-2.5 shadow-md-soft">
              <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">+23% avg. revenue</p>
                <p className="text-[10px] text-muted-foreground">in first 30 days</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
