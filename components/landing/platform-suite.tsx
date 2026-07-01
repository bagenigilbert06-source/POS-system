'use client'

import { useState } from 'react'
import {
  BarChart3,
  Boxes,
  Check,
  CreditCard,
  PackageCheck,
  ReceiptText,
  ScanBarcode,
  UsersRound,
  WalletCards,
} from 'lucide-react'

const tabs = [
  {
    label: 'POS',
    icon: ReceiptText,
    title: 'A checkout experience your staff can learn quickly.',
    text: 'Keep the counter fast with product search, barcode scanning, saved carts, discounts, customer profiles, receipts, and payment reconciliation in the same flow.',
    bullets: ['Open registers with staff permissions', 'Sell with barcode search and saved carts', 'Send receipts and update stock instantly'],
    cards: [
      ['Checkout speed', 'Under 12 sec', ScanBarcode],
      ['Daily sales', 'KES 842K', ReceiptText],
      ['Live margin', '31%', BarChart3],
    ],
  },
  {
    label: 'Inventory',
    icon: Boxes,
    title: 'Know what is available, low, expiring, or moving.',
    text: 'Manage products, variants, expiry dates, transfers, supplier orders, and reorder levels across every branch without spreadsheet drift.',
    bullets: ['Low-stock and expiry alerts', 'Branch transfers with audit trails', 'Supplier reorder suggestions'],
    cards: [
      ['Tracked items', '18,420', Boxes],
      ['Low stock', '18 items', PackageCheck],
      ['Synced branches', '7', BarChart3],
    ],
  },
  {
    label: 'Payments',
    icon: WalletCards,
    title: 'Match every payment to the right sale.',
    text: 'Accept cash, card, mobile money, and invoices while keeping daily reconciliation clear for managers and finance teams.',
    bullets: ['Cash, card, and mobile money', 'Refunds and payment notes', 'End-of-day reconciliation'],
    cards: [
      ['Matched today', '98.4%', CreditCard],
      ['Pending review', '6', WalletCards],
      ['Settlement', 'Same day', BarChart3],
    ],
  },
  {
    label: 'Customers',
    icon: UsersRound,
    title: 'Turn one-time shoppers into repeat customers.',
    text: 'Store purchase history, customer notes, loyalty activity, invoices, and communication records in one connected profile.',
    bullets: ['Customer profiles and history', 'Loyalty and repeat purchase signals', 'Branch-level customer activity'],
    cards: [
      ['Customers', '42,890', UsersRound],
      ['Repeat rate', '38%', BarChart3],
      ['Loyalty active', '12K', Check],
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    title: 'See the numbers that actually run the business.',
    text: 'Track revenue, margins, cashier performance, top products, slow movers, branches, stock risk, and daily close from one dashboard.',
    bullets: ['Branch and cashier performance', 'Margin and top product reports', 'Stock movement insights'],
    cards: [
      ['Net revenue', 'KES 12.8M', BarChart3],
      ['Top products', '124', PackageCheck],
      ['Close time', '12 min', Check],
    ],
  },
]

export function PlatformSuite() {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = tabs[activeIndex]

  return (
    <section id="platform" className="bg-[#005a43] py-16 text-white lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-200">A Complete Platform</p>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            One suite for the work that happens before, during, and after every sale.
          </h2>
        </div>

        <div className="mt-9 flex flex-wrap gap-2 rounded-xl border border-white/15 bg-white/5 p-2">
          {tabs.map((tab, index) => {
            const Icon = tab.icon
            const selected = activeIndex === index
            return (
              <button
                key={tab.label}
                onClick={() => setActiveIndex(index)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-all duration-200 ${
                  selected ? 'bg-white text-[#005a43] shadow-sm' : 'text-white hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="mt-11 grid gap-9 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div key={active.label} className="animate-fade-up">
            <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{active.title}</h3>
            <p className="mt-4 text-base leading-7 text-emerald-50">{active.text}</p>
            <div className="mt-7 grid gap-3">
              {active.bullets.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold text-white">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-[#005a43]">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div key={`${active.label}-cards`} className="animate-fade-up overflow-hidden rounded-xl border border-white/15 bg-white text-zinc-950 shadow-2xl shadow-emerald-950/25">
            <div className="grid gap-px bg-zinc-200 sm:grid-cols-3">
              {active.cards.map(([title, value, Icon]) => (
                <div key={title as string} className="bg-white p-6">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#005a43]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-500">{title as string}</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950">{value as string}</p>
                  <div className="mt-5 h-2 rounded-full bg-zinc-100">
                    <div className="h-2 w-3/4 rounded-full bg-[#005a43]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-200 bg-[#f7faf8] p-5">
              <div className="flex h-32 items-end gap-2">
                {[42, 58, 50, 72, 64, 86, 75, 96, 88, 108, 98, 116].map((height, index) => (
                  <div key={index} className="flex flex-1 items-end rounded-t bg-emerald-100">
                    <div className="w-full rounded-t bg-[#005a43]" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
