'use client'

import { useMemo, useState } from 'react'
import {
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Headphones,
  PackageCheck,
  ReceiptText,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  UsersRound,
  WalletCards,
} from 'lucide-react'

const workspaces = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    status: 'Business command center',
    alertTitle: 'Action queue',
    alertValue: '12 tasks',
    feature: 'Company dashboard',
    featureMeta: 'Sales, stock, cashflow, and team work in one view',
    metricTitle: 'Today',
    metricValue: 'KES 842K',
    metricDelta: '+18% vs yesterday',
    panelTitle: 'Operating pulse',
    panelSubtitle: 'Last 12 hours',
    rows: [
      ['Open sales', 'Across 4 branches', 'KES 842K'],
      ['Stock movements', 'Transfers and receipts', '216'],
      ['Customer follow-ups', 'Loyalty and invoices', '48'],
      ['Team approvals', 'Refunds and discounts', '9'],
    ],
    totalLabel: 'Ready actions',
    total: '12',
    button: 'Review workspace',
    stats: [
      ['Revenue', '842K'],
      ['Orders', '1,284'],
      ['Margin', '31%'],
    ],
    cards: [
      ['Supplier planning', 'Ready purchase orders for fast-moving products.', Truck],
      ['Payments matched', 'Cash, card, and mobile money reconciled.', CreditCard],
    ],
    bars: [38, 48, 43, 62, 58, 76, 68, 88, 80, 98, 92, 110],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ReceiptText,
    status: 'Checkout and invoicing',
    alertTitle: 'Live counters',
    alertValue: '7 active',
    feature: 'Sales workspace',
    featureMeta: 'POS, invoices, discounts, refunds, and receipts',
    metricTitle: 'Collected',
    metricValue: 'KES 621K',
    metricDelta: '+11% this week',
    panelTitle: 'Sales flow',
    panelSubtitle: 'Orders by channel',
    rows: [
      ['POS checkout', 'Fast retail counters', '486'],
      ['Invoices', 'Business customers', '72'],
      ['Online orders', 'Synced channels', '214'],
      ['Refund reviews', 'Needs approval', '5'],
    ],
    totalLabel: 'Sales channels',
    total: '4',
    button: 'Open sales',
    stats: [
      ['Receipts', '486'],
      ['Invoices', '72'],
      ['Refunds', '5'],
    ],
    cards: [
      ['Smart checkout', 'Barcode, tax, discounts, and receipts are ready.', Store],
      ['Payment options', 'Accept cash, card, transfer, and mobile money.', WalletCards],
    ],
    bars: [42, 57, 36, 68, 71, 64, 82, 78, 94, 88, 102, 108],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: PackageCheck,
    status: 'Stock control',
    alertTitle: 'Low stock',
    alertValue: '18 SKUs',
    feature: 'Inventory command',
    featureMeta: 'Products, batches, expiry, transfers, and reorder rules',
    metricTitle: 'Stock value',
    metricValue: 'KES 4.8M',
    metricDelta: '98% counted',
    panelTitle: 'Stock movement',
    panelSubtitle: 'Receipts, sales, and transfers',
    rows: [
      ['Reorder items', 'Below minimum level', '18'],
      ['Branch transfers', 'In progress today', '11'],
      ['Goods received', 'Supplier deliveries', '36'],
      ['Expiry checks', 'Needs manager review', '7'],
    ],
    totalLabel: 'Reorder tasks',
    total: '18',
    button: 'Plan reorder',
    stats: [
      ['Products', '3,420'],
      ['Transfers', '11'],
      ['Accuracy', '98%'],
    ],
    cards: [
      ['Supplier reorder', 'Purchase suggestions based on sales velocity.', Truck],
      ['Audit trail', 'Every adjustment is connected to a user and reason.', ShieldCheck],
    ],
    bars: [35, 45, 58, 52, 74, 69, 83, 91, 86, 96, 104, 99],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: UsersRound,
    status: 'CRM and loyalty',
    alertTitle: 'Follow-ups',
    alertValue: '48 due',
    feature: 'Customer workspace',
    featureMeta: 'Profiles, balances, loyalty, segments, and reminders',
    metricTitle: 'Active customers',
    metricValue: '8,940',
    metricDelta: '+326 this month',
    panelTitle: 'Customer activity',
    panelSubtitle: 'Visits and repeat purchases',
    rows: [
      ['Loyalty members', 'Returning buyers', '5,204'],
      ['Account balances', 'Pending collection', 'KES 312K'],
      ['Birthday offers', 'Ready to send', '86'],
      ['Dormant customers', 'Win-back segment', '184'],
    ],
    totalLabel: 'Campaigns',
    total: '6',
    button: 'View customers',
    stats: [
      ['Profiles', '8.9K'],
      ['Repeat', '64%'],
      ['Due', '48'],
    ],
    cards: [
      ['Customer records', 'History, balances, and preferences stay connected.', FileText],
      ['Support queue', 'Service issues and callbacks are tracked clearly.', Headphones],
    ],
    bars: [28, 34, 47, 55, 51, 67, 72, 78, 83, 91, 98, 106],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Settings,
    status: 'Controls and security',
    alertTitle: 'Approvals',
    alertValue: '9 pending',
    feature: 'Admin console',
    featureMeta: 'Users, roles, branches, taxes, devices, and permissions',
    metricTitle: 'Branches online',
    metricValue: '4 / 4',
    metricDelta: 'Synced now',
    panelTitle: 'Control activity',
    panelSubtitle: 'Security and approvals',
    rows: [
      ['Role updates', 'Permission changes', '3'],
      ['Device sessions', 'Registers and tablets', '14'],
      ['Discount approvals', 'Manager review', '9'],
      ['Data exports', 'Finance reports', '5'],
    ],
    totalLabel: 'Admin tasks',
    total: '9',
    button: 'Open controls',
    stats: [
      ['Users', '38'],
      ['Branches', '4'],
      ['Roles', '6'],
    ],
    cards: [
      ['Role permissions', 'Cashiers, managers, and owners see the right tools.', ShieldCheck],
      ['Branch setup', 'Locations, taxes, devices, and workflows stay aligned.', Building2],
    ],
    bars: [31, 39, 45, 43, 61, 57, 70, 75, 82, 87, 93, 101],
  },
]

export function ProductMockup() {
  const [activeId, setActiveId] = useState(workspaces[0].id)
  const active = useMemo(() => workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0], [activeId])

  return (
    <div className="relative mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => setActiveId('inventory')}
        className="absolute -left-5 top-12 z-10 hidden w-44 rounded-xl border border-emerald-100 bg-white p-4 text-left shadow-2xl shadow-emerald-950/15 transition hover:-translate-y-1 hover:shadow-emerald-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 lg:block"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <BellRing className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black text-zinc-950">{active.alertTitle}</p>
            <p className="text-[11px] text-zinc-500">{active.alertValue}</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-zinc-100">
          <div className="h-2 w-2/3 rounded-full bg-[#005a43]" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => setActiveId('overview')}
        className="absolute -right-5 bottom-12 z-10 hidden w-52 rounded-xl border border-emerald-100 bg-white p-4 text-left shadow-2xl shadow-emerald-950/15 transition hover:-translate-y-1 hover:shadow-emerald-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 lg:block"
      >
        <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{active.metricTitle}</p>
        <p className="mt-1 text-2xl font-black tracking-tight text-[#005a43]">{active.metricValue}</p>
        <p className="mt-1 text-[11px] font-bold text-emerald-700">{active.metricDelta}</p>
      </button>

      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_35px_100px_rgba(0,54,39,0.28)]">
        <div className="flex items-center justify-between border-b border-emerald-900/20 bg-[#071f18] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-extrabold">{active.feature}</p>
              <p className="text-[11px] text-emerald-100/70">{active.status}</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-[11px] font-extrabold text-emerald-100">Synced</span>
        </div>

        <div className="grid min-h-[460px] bg-[#f6fbf8] md:grid-cols-[56px_0.7fr_1.3fr]">
          <div className="flex gap-2 overflow-x-auto border-b border-emerald-100 bg-[#10251e] p-3 md:flex-col md:border-b-0 md:border-r md:px-2">
            {workspaces.map((workspace) => {
              const Icon = workspace.icon
              const isActive = workspace.id === active.id
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => setActiveId(workspace.id)}
                  className={`group flex h-10 w-10 flex-none items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 ${
                    isActive ? 'bg-white text-[#005a43]' : 'bg-white/5 text-emerald-50/70 hover:bg-white/10 hover:text-white'
                  }`}
                  aria-label={`Show ${workspace.label}`}
                  title={workspace.label}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              )
            })}
          </div>

          <div className="border-b border-emerald-100 bg-white p-5 md:border-b-0 md:border-r">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-zinc-950">{active.label}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{active.featureMeta}</p>
              </div>
              <ReceiptText className="h-4 w-4 flex-none text-[#005a43]" aria-hidden="true" />
            </div>
            {active.rows.map(([name, qty, total]) => (
              <button
                key={name}
                type="button"
                className="grid w-full grid-cols-[1fr_auto] gap-3 border-b border-emerald-50 py-3 text-left text-sm transition hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 last:border-b-0"
              >
                <span>
                  <span className="block font-bold text-zinc-950">{name}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{qty}</span>
                </span>
                <span className="font-extrabold text-zinc-950">{total}</span>
              </button>
            ))}
            <div className="mt-5 rounded-xl bg-[#005a43] p-4 text-white shadow-lg shadow-emerald-900/15">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-bold text-emerald-100">{active.totalLabel}</span>
                <span className="text-2xl font-black tracking-tight">{active.total}</span>
              </div>
              <button
                type="button"
                className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-white text-sm font-extrabold text-[#005a43] transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              >
                {active.button}
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {active.stats.map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-xl border border-emerald-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                >
                  <p className="text-[11px] font-bold text-zinc-500">{label}</p>
                  <p className="mt-1 text-xl font-black text-[#005a43]">{value}</p>
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-zinc-950">{active.panelTitle}</p>
                  <p className="text-xs text-zinc-500">{active.panelSubtitle}</p>
                </div>
                <BarChart3 className="h-4 w-4 text-[#005a43]" aria-hidden="true" />
              </div>
              <div className="flex h-36 items-end gap-2">
                {active.bars.map((height, index) => (
                  <button
                    key={index}
                    type="button"
                    className="flex flex-1 items-end rounded-t bg-emerald-50 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                    style={{ height: `${Math.max(height - 16, 25)}%` }}
                    aria-label={`${active.panelTitle} bar ${index + 1}`}
                  >
                    <span className="w-full rounded-t bg-[#005a43]" style={{ height: `${height}%` }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {active.cards.map(([title, text, Icon]) => (
                <button
                  key={title as string}
                  type="button"
                  className="rounded-xl border border-emerald-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-950/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                >
                  <Icon className="h-5 w-5 text-[#005a43]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-extrabold text-zinc-950">{title as string}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{text as string}</p>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Click the sidebar to preview how Pesaby connects sales, stock, customers, and admin.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
