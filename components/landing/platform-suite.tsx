'use client'

import {
  IconChartBar as BarChart3,
  IconPackages as Boxes,
  IconPackage as PackageCheck,
  IconReceipt as ReceiptText,
  IconUsers as UsersRound,
  IconWallet as WalletCards,
} from '@tabler/icons-react'

const features = [
  {
    title: 'Sales and payments',
    description: 'Complete sales, issue receipts, apply discounts, and keep cash, card, mobile money, invoices, and refunds connected.',
    icon: ReceiptText,
  },
  {
    title: 'Inventory and purchasing',
    description: 'Track stock across locations, manage transfers and suppliers, receive deliveries, and respond to reorder alerts.',
    icon: Boxes,
  },
  {
    title: 'Expenses and cash flow',
    description: 'Record operating expenses, organize payment activity, and understand what came in and went out each day.',
    icon: WalletCards,
  },
  {
    title: 'Customers and staff',
    description: 'Keep customer history close while managing staff roles, access, shifts, approvals, and accountability.',
    icon: UsersRound,
  },
  {
    title: 'Multi-branch operations',
    description: 'Standardize workflows, compare locations, transfer stock, and monitor branch activity from one workspace.',
    icon: PackageCheck,
  },
  {
    title: 'Reporting and decisions',
    description: 'Review sales, expenses, margins, stock movement, and team activity without rebuilding the day in spreadsheets.',
    icon: BarChart3,
  },
]

export function PlatformSuite() {
  return (
    <section
      id="platform"
      className="relative overflow-hidden bg-white py-20 text-slate-950 sm:py-24 lg:py-28"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-black/10" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e42527]">A complete Business Operating System</p>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl">
            Connect the work, people, and numbers that keep your business moving.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Pesaby brings sales, stock, expenses, staff, customers, suppliers, payments, and reporting together so every team works from the same operational truth.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="flex min-h-[218px] flex-col rounded-lg border border-black/10 bg-white p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#ffda32] text-slate-950">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-black/10 bg-[#f7f1e5] p-8 text-slate-950">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#e42527]">Why teams rely on Pesaby</p>
            <ul className="mt-8 space-y-4 text-sm leading-7 text-slate-600">
              <li>One system for tills, stock, customers, suppliers, and daily reports.</li>
              <li>Less manual reconciliation and fewer errors during busy sales periods.</li>
              <li>Clear visibility across branches, payments, and product movement.</li>
              <li>Customer records and loyalty details that support faster service.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-black/10 bg-[#ffda32] p-8 text-slate-950">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#e42527]">Built for fast operations</p>
            <div className="mt-8 space-y-4 text-sm leading-7 text-slate-800">
              <p>Keep the counter moving with workflows staff can learn quickly and use confidently from day one.</p>
              <p>Give managers a clearer view of stock, sales, and payments so daily decisions are faster and more reliable.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
