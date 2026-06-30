'use client'

import { useState } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const industries = [
  {
    id: 'retail',
    name: 'Retail & Supermarkets',
    subtitle: 'From corner shops to multi-aisle supermarkets',
    color: 'bg-blue-500',
    features: [
      'Barcode scanning & receipt printing',
      'Bulk product import via spreadsheet',
      'Daily stock reconciliation',
      'Mobile money & card payments',
      'Customer loyalty programme',
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurants & Cafes',
    subtitle: 'Table service, takeaway & delivery',
    color: 'bg-orange-500',
    features: [
      'Table & order management',
      'Kitchen display system',
      'Menu & modifier builder',
      'Split-bill & tip tracking',
      'Daily sales & void reports',
    ],
  },
  {
    id: 'pharmacy',
    name: 'Pharmacies',
    subtitle: 'Retail clinics, drugstores & dispensaries',
    color: 'bg-green-500',
    features: [
      'Expiry date tracking & alerts',
      'Prescription & patient records',
      'Controlled substance logs',
      'NHIF billing support',
      'Supplier reorder management',
    ],
  },
  {
    id: 'salon',
    name: 'Salons & Beauty',
    subtitle: 'Hair, nails, spa & wellness services',
    color: 'bg-pink-500',
    features: [
      'Appointment booking & calendar',
      'Stylist performance tracking',
      'Product & service sales',
      'Client history & notes',
      'Commission management',
    ],
  },
  {
    id: 'hardware',
    name: 'Hardware Stores',
    subtitle: 'Tools, building materials & supplies',
    color: 'bg-amber-500',
    features: [
      'Bulk & per-unit sales',
      'Customer credit accounts',
      'Supplier purchase orders',
      'Stock by warehouse location',
      'LPO & invoice generation',
    ],
  },
  {
    id: 'wholesale',
    name: 'Wholesale & Distribution',
    subtitle: 'Bulk goods, depots & delivery routes',
    color: 'bg-violet-500',
    features: [
      'Tiered pricing by customer',
      'Delivery & route management',
      'Multi-warehouse stock control',
      'Credit & debt management',
      'Volume discount automation',
    ],
  },
]

// Mini dashboard mockups per industry
const industryMockups: Record<string, React.ReactNode> = {
  retail: (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg bg-secondary p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Daily Sales</p>
          <p className="text-base font-bold text-foreground">KES 84,320</p>
          <p className="text-[10px] text-green-500 font-medium">+12.4% vs yesterday</p>
        </div>
        <div className="flex-1 rounded-lg bg-secondary p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Items Sold</p>
          <p className="text-base font-bold text-foreground">1,204</p>
          <p className="text-[10px] text-green-500 font-medium">247 transactions</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-[10px] font-semibold text-foreground mb-2">Top Products Today</p>
        {[['Unga 2kg', 'KES 12,400'], ['Cooking Oil 1L', 'KES 9,800'], ['Sugar 1kg', 'KES 7,200']].map(([name, val]) => (
          <div key={name} className="flex justify-between items-center py-1 border-b border-border last:border-0">
            <span className="text-[10px] text-muted-foreground">{name}</span>
            <span className="text-[10px] font-semibold text-foreground">{val}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  restaurant: (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-[10px] font-semibold text-foreground mb-2">Active Tables</p>
        <div className="grid grid-cols-5 gap-1.5">
          {[1,2,3,4,5,6,7,8,9,10].map((t) => (
            <div key={t} className={`rounded-md p-1.5 text-center text-[9px] font-bold ${t <= 6 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground border border-border'}`}>
              T{t}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">6 tables occupied · 4 available</p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg bg-secondary p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Orders Today</p>
          <p className="text-base font-bold text-foreground">89</p>
        </div>
        <div className="flex-1 rounded-lg bg-secondary p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Avg Bill</p>
          <p className="text-base font-bold text-foreground">KES 1,240</p>
        </div>
      </div>
    </div>
  ),
  pharmacy: (
    <div className="space-y-2">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">3 items expiring in 30 days</p>
        </div>
        <p className="text-[10px] text-muted-foreground">Amoxicillin 500mg, Metformin 1g, Paracetamol 500mg</p>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-[10px] font-semibold text-foreground mb-2">Today&apos;s Dispensing</p>
        {[['Prescriptions', '42'], ['OTC Sales', '118'], ['NHIF Claims', '14']].map(([label, val]) => (
          <div key={label} className="flex justify-between py-1 border-b border-border last:border-0">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className="text-[10px] font-bold text-foreground">{val}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  salon: (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-[10px] font-semibold text-foreground mb-2">Today&apos;s Appointments</p>
        {[['09:00', 'Mary W. — Cut & Colour', 'Grace'], ['11:30', 'Alice N. — Braids', 'Fatuma'], ['14:00', 'Njeri M. — Nails', 'Aisha']].map(([time, client, stylist]) => (
          <div key={time} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
            <span className="text-[9px] text-muted-foreground w-8 flex-shrink-0">{time}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-foreground truncate">{client}</p>
              <p className="text-[9px] text-muted-foreground">{stylist}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
  hardware: (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 rounded-lg bg-secondary p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Open LPOs</p>
          <p className="text-base font-bold text-foreground">7</p>
          <p className="text-[10px] text-amber-500 font-medium">KES 420K pending</p>
        </div>
        <div className="flex-1 rounded-lg bg-secondary p-3 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Credit Accounts</p>
          <p className="text-base font-bold text-foreground">34</p>
          <p className="text-[10px] text-muted-foreground">Active customers</p>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-[10px] font-semibold text-foreground mb-1.5">Low Stock Alert</p>
        {[['Cement 50kg', '12 bags left'], ['Wire 2.5mm', '2 rolls left']].map(([item, stock]) => (
          <div key={item} className="flex justify-between py-1 border-b border-border last:border-0">
            <span className="text-[10px] text-muted-foreground">{item}</span>
            <span className="text-[10px] font-medium text-red-500">{stock}</span>
          </div>
        ))}
      </div>
    </div>
  ),
  wholesale: (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-[10px] font-semibold text-foreground mb-2">Active Routes Today</p>
        {[['Route A — Nairobi CBD', '14 stops', 'KES 280K'], ['Route B — Westlands', '9 stops', 'KES 190K']].map(([route, stops, val]) => (
          <div key={route} className="py-1.5 border-b border-border last:border-0">
            <div className="flex justify-between">
              <span className="text-[10px] font-medium text-foreground">{route}</span>
              <span className="text-[10px] font-bold text-foreground">{val}</span>
            </div>
            <span className="text-[9px] text-muted-foreground">{stops}</span>
          </div>
        ))}
      </div>
    </div>
  ),
}

export function LandingIndustries() {
  const [activeId, setActiveId] = useState('retail')
  const active = industries.find((i) => i.id === activeId) ?? industries[0]

  return (
    <section id="industries" className="section-padding-premium bg-secondary border-b border-border">
      <div className="container-wide">
        {/* Header */}
        <div className="max-w-2xl mb-14 md:mb-16">
          <p className="section-eyebrow mb-3">Industry Workspaces</p>
          <h2 className="section-heading mb-5 text-3xl md:text-4xl lg:text-5xl leading-tight">
            IMARA adapts to how <br className="hidden md:block" />
            <span className="text-muted-foreground">your business works.</span>
          </h2>
          <p className="section-subheading">
            Sign up, choose your industry, and IMARA builds your workspace automatically —
            with the right modules, templates, and defaults for your type of business.
          </p>
        </div>

        {/* Setup flow */}
        <div className="flex items-center gap-2 flex-wrap mb-12 text-sm">
          {['Sign Up', 'Choose Industry', 'Choose Category', 'Workspace Built Automatically', 'Start Working'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5">
                <span className="h-4 w-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-white">{i + 1}</span>
                </span>
                <span className="text-xs font-medium text-foreground whitespace-nowrap">{step}</span>
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />}
            </div>
          ))}
        </div>

        {/* Tab pills */}
        <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Industry selector">
          {industries.map((ind) => (
            <button
              key={ind.id}
              role="tab"
              aria-selected={activeId === ind.id}
              onClick={() => setActiveId(ind.id)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-150 ${
                activeId === ind.id
                  ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {ind.name}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border rounded-2xl overflow-hidden border border-border shadow-sm-soft">
          {/* Left: mockup */}
          <div className="bg-card p-6 md:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${active.color}`} />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{active.name} Dashboard</p>
              </div>
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted" />
                <span className="h-2 w-2 rounded-full bg-muted" />
                <span className="h-2 w-2 rounded-full bg-muted" />
              </div>
            </div>
            <div className="flex-1">
              {industryMockups[active.id]}
            </div>
          </div>

          {/* Right: copy */}
          <div className="bg-card p-6 md:p-8 border-t md:border-t-0 md:border-l border-border flex flex-col gap-6">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">{active.name}</h3>
              <p className="text-sm text-muted-foreground">{active.subtitle}</p>
            </div>

            <ul className="space-y-3" aria-label={`Features for ${active.name}`}>
              {active.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="pt-2 mt-auto">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all duration-150 hover:opacity-90 shadow-sm"
              >
                Start with {active.name.split(' ')[0]}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Don&apos;t see your industry?{' '}
          <a href="mailto:hello@imara.co" className="text-primary font-semibold hover:underline">
            Talk to us — IMARA works for any product or service business.
          </a>
        </p>
      </div>
    </section>
  )
}
