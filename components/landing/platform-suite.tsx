'use client'

import {
  BarChart3,
  Boxes,
  PackageCheck,
  ReceiptText,
  UsersRound,
  WalletCards,
} from 'lucide-react'

const features = [
  {
    title: 'Fast checkout flow',
    description: 'Scan items, apply discounts, and complete cash, card, or mobile money payments in a single tidy POS workflow.',
    icon: ReceiptText,
  },
  {
    title: 'Branch stock control',
    description: 'Track inventory across outlets, manage transfers, and stay ahead of low-stock situations before they affect sales.',
    icon: Boxes,
  },
  {
    title: 'Payment reconciliation',
    description: 'Match every sale to the right payment method and close the day with clearer cash and mobile money records.',
    icon: WalletCards,
  },
  {
    title: 'Customer profiles',
    description: 'Keep purchase history, contact details, and loyalty activity in one place for faster repeat service.',
    icon: UsersRound,
  },
  {
    title: 'Supplier purchasing',
    description: 'Create purchase orders, receive deliveries, and keep supplier costs aligned with your stock movement.',
    icon: PackageCheck,
  },
  {
    title: 'Sales performance insights',
    description: 'Review daily sales, margins, and top products so managers can make quicker restock and pricing decisions.',
    icon: BarChart3,
  },
]

export function PlatformSuite() {
  return (
    <section
      id="platform"
      className="relative overflow-hidden py-16 text-white lg:py-20"
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(2, 6, 23, 0.88) 0%, rgba(15, 23, 42, 0.72) 45%, rgba(2, 132, 199, 0.18) 100%), url('/images/pos-dashboard.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'scroll',
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/50 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">POS + BOS for daily operations</p>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Run tills, stock, payments, suppliers, and customer service from one dependable business system.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200">
            Pesaby brings checkout, inventory, reconciliation, and reporting together so retail and wholesale teams can move faster with fewer manual steps.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur-2xl transition hover:-translate-y-1 hover:border-white/25">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-200/20 text-emerald-200">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{feature.description}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-8 text-slate-100 shadow-2xl shadow-emerald-950/20 backdrop-blur-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Why teams rely on Pesaby</p>
            <ul className="mt-8 space-y-4 text-sm leading-7 text-slate-300">
              <li>One system for tills, stock, customers, suppliers, and daily reports.</li>
              <li>Less manual reconciliation and fewer errors during busy sales periods.</li>
              <li>Clear visibility across branches, payments, and product movement.</li>
              <li>Customer records and loyalty details that support faster service.</li>
            </ul>
          </div>
          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-8 text-slate-100 shadow-2xl shadow-emerald-950/20 backdrop-blur-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Built for fast operations</p>
            <div className="mt-8 space-y-4 text-sm leading-7 text-slate-300">
              <p>Keep the counter moving with workflows staff can learn quickly and use confidently from day one.</p>
              <p>Give managers a clearer view of stock, sales, and payments so daily decisions are faster and more reliable.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
