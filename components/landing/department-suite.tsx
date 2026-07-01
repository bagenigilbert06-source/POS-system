'use client'

import { useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  Headset,
  Megaphone,
  Store,
  UsersRound,
  WalletCards,
  Wrench,
  Zap,
} from 'lucide-react'

const departments = [
  {
    label: 'Sales',
    icon: BarChart3,
    title: 'Define and automate your sales process',
    text: 'Give your team a structured way to capture leads, follow up, close sales, and keep revenue moving across every branch.',
    apps: [
      ['CRM', WalletCards, 'text-blue-600'],
      ['Pipeline', Zap, 'text-green-600'],
      ['Bookings', Check, 'text-blue-600'],
      ['Live chat', Headset, 'text-red-600'],
    ],
    accent: '#67a9e8',
    view: 'targets',
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    title: 'Engage customers across every channel',
    text: 'Build campaigns, automate follow-ups, segment customers, and turn one-time shoppers into repeat buyers.',
    apps: [
      ['Campaigns', Megaphone, 'text-red-600'],
      ['Forms', Check, 'text-emerald-600'],
      ['Social', UsersRound, 'text-blue-600'],
      ['Automation', Zap, 'text-amber-600'],
    ],
    accent: '#54c6a2',
    view: 'automation',
  },
  {
    label: 'Service',
    icon: Headset,
    title: 'Resolve issues before customers walk away',
    text: 'Track requests, assign responsibility, monitor response times, and keep support history tied to each customer.',
    apps: [
      ['Desk', Headset, 'text-green-600'],
      ['Assist', Check, 'text-emerald-600'],
      ['Lens', UsersRound, 'text-red-600'],
    ],
    accent: '#4ba3ff',
    view: 'service',
  },
  {
    label: 'Finance',
    icon: Calculator,
    title: 'Keep payments and daily numbers clean',
    text: 'Reconcile cash, card, mobile money, refunds, invoices, expenses, and tax-ready summaries from one place.',
    apps: [
      ['Books', Calculator, 'text-blue-600'],
      ['Payments', WalletCards, 'text-emerald-600'],
      ['Reports', BarChart3, 'text-amber-600'],
    ],
    accent: '#f2b84b',
    view: 'finance',
  },
  {
    label: 'HR',
    icon: UsersRound,
    title: 'Give every role the right workspace',
    text: 'Manage staff access, shifts, approvals, cashier accountability, and performance without slowing the counter.',
    apps: [
      ['People', UsersRound, 'text-blue-600'],
      ['Shifts', Check, 'text-green-600'],
      ['Roles', Wrench, 'text-zinc-700'],
    ],
    accent: '#8b7cf6',
    view: 'people',
  },
  {
    label: 'Operations',
    icon: Wrench,
    title: 'Coordinate stock, suppliers, and branches',
    text: 'Connect purchasing, transfers, supplier orders, reorder alerts, and branch performance into one operating rhythm.',
    apps: [
      ['Inventory', Store, 'text-emerald-600'],
      ['Suppliers', Wrench, 'text-zinc-700'],
      ['Branches', BarChart3, 'text-blue-600'],
    ],
    accent: '#0f8f68',
    view: 'ops',
  },
  {
    label: 'eCommerce',
    icon: Store,
    title: 'Sell online and in-store with one stock truth',
    text: 'Keep online orders, walk-in sales, customer records, and inventory movements synchronized as the business grows.',
    apps: [
      ['Storefront', Store, 'text-emerald-600'],
      ['Payments', WalletCards, 'text-blue-600'],
      ['Customers', UsersRound, 'text-red-600'],
    ],
    accent: '#ef6f78',
    view: 'commerce',
  },
]

function AnalyticsPanel({ accent, view }: { accent: string; view: string }) {
  const isAutomation = view === 'automation'
  const isService = view === 'service'

  return (
    <div className="rounded-xl border border-[#ddd2bd] bg-white p-4 shadow-[0_20px_60px_rgba(75,61,32,0.10)] transition-all duration-300 sm:p-6">
      {isAutomation ? (
        <div className="grid gap-5 md:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-lg border border-zinc-200 bg-[#fbfcff] p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">Lead nurturing</p>
            <div className="mt-6 space-y-5">
              {['Form submission', 'Send email', 'Time delay', 'Follow-up message'].map((step, index) => (
                <div key={step} className="flex items-center gap-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: accent }}>
                    {index + 1}
                  </span>
                  <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                    <p className="text-xs font-bold text-zinc-900">{step}</p>
                    <div className="mt-2 h-2 w-2/3 rounded-full bg-zinc-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">Trigger library</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-16 rounded-md border border-dashed border-blue-200 bg-blue-50/50" />
              ))}
            </div>
          </div>
        </div>
      ) : isService ? (
        <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-lg border border-zinc-200 p-5">
            <p className="text-sm font-bold text-zinc-950">Incoming and outgoing bandwidth</p>
            <div className="mt-6 flex h-44 items-end gap-2">
              {[76, 32, 52, 42, 42, 44, 58, 53, 48, 62, 88].map((height, index) => (
                <div key={index} className="flex flex-1 items-end rounded-t bg-zinc-100">
                  <div className="w-full rounded-t" style={{ height: `${height}%`, backgroundColor: index % 2 ? '#4ba3ff' : '#4fc36b' }} />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            {['Live traffic', 'Happiness rating'].map((label, index) => (
              <div key={label} className="rounded-lg border border-zinc-200 p-5">
                <p className="text-sm font-bold text-zinc-950">{label}</p>
                <p className="mt-4 text-3xl font-extrabold" style={{ color: index ? '#16a34a' : accent }}>
                  {index ? '93%' : '20'}
                </p>
                <div className="mt-3 h-2 rounded-full bg-zinc-100">
                  <div className="h-2 w-3/4 rounded-full" style={{ backgroundColor: index ? '#16a34a' : accent }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 p-4 md:col-span-2">
            <p className="text-sm font-bold text-zinc-950">Performance tracker</p>
            <div className="mt-5 space-y-4">
              {[72, 62, 78].map((width, index) => (
                <div key={index} className="grid grid-cols-[32px_1fr] items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                    {index + 1}
                  </div>
                  <div className="h-7 bg-zinc-100">
                    <div className="flex h-7 items-center justify-end pr-3 text-xs font-bold text-white" style={{ width: `${width}%`, backgroundColor: accent }}>
                      {width}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4">
            <p className="text-sm font-bold text-zinc-950">Team score</p>
            <p className="mt-4 text-3xl font-extrabold">343</p>
            <p className="mt-1 text-xs text-zinc-500">tasks remaining</p>
            <div className="mt-5 h-2 rounded-full bg-zinc-100">
              <div className="h-2 w-2/3 rounded-full" style={{ backgroundColor: accent }} />
            </div>
            <p className="mt-6 text-sm font-bold text-zinc-950">Org health</p>
            <p className="mt-2 text-2xl font-extrabold">910</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4">
            <p className="text-sm font-bold text-zinc-950">Completion</p>
            <div className="mt-6 h-8 bg-zinc-100">
              <div className="h-8 w-3/4" style={{ backgroundColor: accent }} />
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4 md:col-span-2">
            <p className="text-sm font-bold text-zinc-950">Activity by source</p>
            <div className="mt-5 grid grid-cols-7 gap-1">
              {Array.from({ length: 42 }).map((_, index) => (
                <div
                  key={index}
                  className="h-6 rounded-sm"
                  style={{ backgroundColor: `${accent}${['33', '44', '55', '66', '77'][index % 5]}` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DepartmentSuite() {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = departments[activeIndex]

  return (
    <section className="bg-[#f4efe4] py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <h2 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-zinc-950 sm:text-5xl">
          Every team gets the tools they need. The business stays connected.
        </h2>

        <div className="mt-10 flex flex-wrap items-center gap-2 rounded-xl border border-[#ddd2bd] bg-white/80 p-2 shadow-sm">
          {departments.map((tab, index) => {
            const Icon = tab.icon
            const selected = activeIndex === index
            return (
              <button
                key={tab.label}
                onClick={() => setActiveIndex(index)}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-all duration-200 ${
                  selected ? 'bg-[#005a43] text-white shadow-sm' : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div key={active.label} className="animate-fade-up">
            <h3 className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight text-zinc-950">
              {active.title}
            </h3>
            <p className="mt-5 max-w-md text-base leading-7 text-zinc-700">
              {active.text}
            </p>
            <a href="#platform" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold uppercase text-[#d92534] underline-offset-4 hover:underline">
              Learn more
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <div className="mt-10 flex flex-wrap gap-4">
              {active.apps.map(([label, Icon, color]) => (
                <div key={label as string} className="w-20 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-[#ddd2bd] bg-white/80">
                    <Icon className={`h-7 w-7 ${color as string}`} aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-xs font-bold text-zinc-950">{label as string}</p>
                </div>
              ))}
            </div>
          </div>

          <div key={`${active.label}-panel`} className="animate-fade-up">
            <AnalyticsPanel accent={active.accent} view={active.view} />
          </div>
        </div>
      </div>
    </section>
  )
}
