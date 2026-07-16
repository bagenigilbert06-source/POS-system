'use client'

import { useMemo, useState, useEffect } from 'react'
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
  Zap,
  TrendingUp,
} from 'lucide-react'

const workspaces = [
  {
    id: 'overview',
    label: 'Command Center',
    icon: BarChart3,
    status: 'Real-time business dashboard',
    alertTitle: 'Critical actions',
    alertValue: '12 active',
    feature: 'Live Dashboard',
    featureMeta: 'Sales velocity, stock alerts, payments & team performance',
    metricTitle: 'Today Sales',
    metricValue: 'KES 842K',
    metricDelta: '+18% vs yesterday',
    panelTitle: 'Sales velocity',
    panelSubtitle: 'Hourly performance',
    rows: [
      ['Live registers', '7 terminals active', 'KES 842K'],
      ['Pending payment', 'Verification queue', '12 items'],
      ['Low stock alerts', 'Critical products', '18 SKUs'],
      ['Team on shift', 'Active checkout staff', '12'],
    ],
    totalLabel: 'Active tasks',
    total: '12',
    button: 'View dashboard',
    stats: [
      ['Revenue', '842K'],
      ['Orders', '1,284'],
      ['Margin', '31%'],
    ],
    cards: [
      ['Payment reconciliation', 'Auto-match cash, cards & mobile money instantly.', CreditCard],
      ['Critical alerts', 'Stock, payment & staff issues flagged real-time.', Zap],
    ],
    bars: [38, 48, 43, 62, 58, 76, 68, 88, 80, 98, 92, 110],
  },
  {
    id: 'sales',
    label: 'POS Checkout',
    icon: ReceiptText,
    status: 'Fast counter operations',
    alertTitle: 'Terminals',
    alertValue: '7 active',
    feature: 'Point of Sale',
    featureMeta: 'Barcode scanning, instant checkout, discounts & receipts',
    metricTitle: 'Collected',
    metricValue: 'KES 621K',
    metricDelta: '+11% this week',
    panelTitle: 'Checkout speed',
    panelSubtitle: 'Transactions per hour',
    rows: [
      ['POS transactions', 'Completed sales', '486'],
      ['Invoices issued', 'B2B & credit', '72'],
      ['Refunds processed', 'Same-day returns', '5'],
      ['Payment errors', 'Auto-flagged', '2'],
    ],
    totalLabel: 'Transactions',
    total: '486',
    button: 'Open registers',
    stats: [
      ['Throughput', '486/day'],
      ['Accuracy', '99.8%'],
      ['Avg time', '1.2 min'],
    ],
    cards: [
      ['Instant checkout', 'Barcode scan → tax → discount → payment in seconds.', Store],
      ['Payment options', 'Cash, card, mobile money & digital wallets supported.', WalletCards],
    ],
    bars: [42, 57, 36, 68, 71, 64, 82, 78, 94, 88, 102, 108],
  },
  {
    id: 'inventory',
    label: 'Stock Control',
    icon: PackageCheck,
    status: 'Real-time inventory management',
    alertTitle: 'Low stock',
    alertValue: '18 SKUs',
    feature: 'Inventory System',
    featureMeta: 'Live stock, expiry tracking, transfers & reorder automation',
    metricTitle: 'Stock value',
    metricValue: 'KES 4.8M',
    metricDelta: '98% visibility',
    panelTitle: 'Stock movement',
    panelSubtitle: 'Daily transactions',
    rows: [
      ['Reorder triggered', 'Below minimum', '18'],
      ['Branch transfers', 'In transit', '11'],
      ['Goods received', 'Pending intake', '36'],
      ['Expiry alerts', 'Action needed', '7'],
    ],
    totalLabel: 'Reorder items',
    total: '18',
    button: 'Manage inventory',
    stats: [
      ['Products', '3,420'],
      ['Accuracy', '98%'],
      ['Transfers', '11'],
    ],
    cards: [
      ['Auto reorder', 'Smart suggestions based on sales history & velocity.', TrendingUp],
      ['Audit trail', 'Every item tracked: user, time, reason & location.', ShieldCheck],
    ],
    bars: [35, 45, 58, 52, 74, 69, 83, 91, 86, 96, 104, 99],
  },
  {
    id: 'customers',
    label: 'Customers & Loyalty',
    icon: UsersRound,
    status: 'CRM and relationship management',
    alertTitle: 'Follow-ups',
    alertValue: '48 due',
    feature: 'Customer Workspace',
    featureMeta: 'Profiles, credit tracking, loyalty rewards & repeat buyers',
    metricTitle: 'Active members',
    metricValue: '8,940',
    metricDelta: '+326 this month',
    panelTitle: 'Customer engagement',
    panelSubtitle: 'Repeat purchase rate',
    rows: [
      ['Loyalty members', 'Returning shoppers', '5,204'],
      ['Account balances', 'Credit extended', 'KES 312K'],
      ['Next purchase due', 'In 7 days', '1,284'],
      ['VIP customers', 'Premium segment', '342'],
    ],
    totalLabel: 'Member base',
    total: '8.9K',
    button: 'View customers',
    stats: [
      ['Members', '8.9K'],
      ['Repeat', '64%'],
      ['Due today', '48'],
    ],
    cards: [
      ['Quick profiles', 'Name, balance, loyalty points & purchase history instant.', FileText],
      ['Customer support', 'Track issues, callbacks & resolution in real-time.', Headphones],
    ],
    bars: [28, 34, 47, 55, 51, 67, 72, 78, 83, 91, 98, 106],
  },
  {
    id: 'admin',
    label: 'Admin & Control',
    icon: Settings,
    status: 'Security, permissions & operations',
    alertTitle: 'Approvals',
    alertValue: '9 pending',
    feature: 'Admin Console',
    featureMeta: 'Users, roles, terminals, branches, security & audit logs',
    metricTitle: 'Online branches',
    metricValue: '4 / 4',
    metricDelta: 'Fully synced',
    panelTitle: 'System activity',
    panelSubtitle: 'Operations per hour',
    rows: [
      ['Role approvals', 'Permission updates', '3'],
      ['Terminal sessions', 'Active devices', '14'],
      ['Discount approvals', 'Manager review', '9'],
      ['Data backups', 'Auto-synced', '4'],
    ],
    totalLabel: 'Control tasks',
    total: '9',
    button: 'Open admin',
    stats: [
      ['Users', '38'],
      ['Branches', '4'],
      ['Permissions', '6'],
    ],
    cards: [
      ['Granular roles', 'Cashier, supervisor & manager permissions fully customizable.', ShieldCheck],
      ['Branch network', 'Setup branches, terminals, tax configs & sync settings.', Building2],
    ],
    bars: [31, 39, 45, 43, 61, 57, 70, 75, 82, 87, 93, 101],
  },
]

export function ProductMockup() {
  const [activeId, setActiveId] = useState(workspaces[0].id)
  const [isLoading, setIsLoading] = useState(false)
  const active = useMemo(() => workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0], [activeId])

  const handleTabChange = (id: string) => {
    setIsLoading(true)
    setActiveId(id)
    setTimeout(() => setIsLoading(false), 300)
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(14, 165, 233, 0);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        .animate-slide-left {
          animation: slideInLeft 0.5s ease-out;
        }
        .animate-slide-right {
          animation: slideInRight 0.5s ease-out;
        }
        .animate-slide-up {
          animation: slideInUp 0.6s ease-out;
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite;
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .transition-smooth {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Alert Notification - Left */}
      <button
        type="button"
        onClick={() => handleTabChange('inventory')}
        className="absolute -left-5 top-12 z-10 hidden w-44 rounded-xl border border-emerald-100 bg-white p-4 text-left shadow-2xl shadow-emerald-950/15 transition-smooth hover:-translate-y-1 hover:shadow-emerald-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 lg:block animate-slide-left"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 animate-pulse-glow">
            <BellRing className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black text-zinc-950">{active.alertTitle}</p>
            <p className="text-[11px] text-zinc-500">{active.alertValue}</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
          <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-[#005a43] to-emerald-500 transition-smooth" />
        </div>
      </button>

      {/* Metric Card - Right */}
      <button
        type="button"
        onClick={() => handleTabChange('overview')}
        className="absolute -right-5 bottom-12 z-10 hidden w-52 rounded-xl border border-emerald-100 bg-white p-4 text-left shadow-2xl shadow-emerald-950/15 transition-smooth hover:-translate-y-1 hover:shadow-emerald-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 lg:block animate-slide-right"
      >
        <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">{active.metricTitle}</p>
        <p className="mt-1 text-2xl font-black tracking-tight bg-gradient-to-r from-[#005a43] to-emerald-600 bg-clip-text text-transparent">{active.metricValue}</p>
        <p className="mt-1 text-[11px] font-bold text-emerald-700">{active.metricDelta}</p>
      </button>

      {/* Main Container */}
      <div className="overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_35px_100px_rgba(0,54,39,0.28)] transition-smooth">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-900/20 bg-gradient-to-r from-[#071f18] to-[#0a2f28] px-5 py-4 text-white animate-slide-down">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 transition-smooth">
              <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-extrabold">{active.feature}</p>
              <p className="text-[11px] text-emerald-100/70">{active.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-extrabold text-emerald-100">Live</span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid min-h-[460px] bg-gradient-to-b from-[#f6fbf8] to-[#f0f9f6] md:grid-cols-[56px_0.7fr_1.3fr]">
          {/* Sidebar Navigation */}
          <div className="flex gap-2 overflow-x-auto border-b border-emerald-100 bg-gradient-to-b from-[#10251e] to-[#0a1f18] p-3 md:flex-col md:border-b-0 md:border-r md:px-2 animate-slide-left">
            {workspaces.map((workspace, index) => {
              const Icon = workspace.icon
              const isActive = workspace.id === active.id
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => handleTabChange(workspace.id)}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                  className={`group flex h-10 w-10 flex-none items-center justify-center rounded-lg transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 ${
                    isActive
                      ? 'bg-gradient-to-br from-white to-emerald-50 text-[#005a43] shadow-lg shadow-white/20 scale-110'
                      : 'bg-white/5 text-emerald-50/70 hover:bg-white/15 hover:text-white hover:-translate-y-0.5'
                  }`}
                  aria-label={`Show ${workspace.label}`}
                  title={workspace.label}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              )
            })}
          </div>

          {/* Left Panel - Data List */}
          <div className={`border-b border-emerald-100 bg-white p-5 md:border-b-0 md:border-r transition-smooth ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <div className="mb-4 flex items-center justify-between gap-3 animate-slide-up">
              <div>
                <p className="text-sm font-extrabold text-zinc-950">{active.label}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{active.featureMeta}</p>
              </div>
              <ReceiptText className="h-4 w-4 flex-none text-[#005a43]" aria-hidden="true" />
            </div>
            {active.rows.map(([name, qty, total], index) => (
              <button
                key={name}
                type="button"
                style={{
                  animationDelay: `${index * 75}ms`,
                }}
                className="grid w-full grid-cols-[1fr_auto] gap-3 border-b border-emerald-50 py-3 text-left text-sm transition-smooth hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 last:border-b-0 animate-slide-up"
              >
                <span>
                  <span className="block font-bold text-zinc-950">{name}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{qty}</span>
                </span>
                <span className="font-extrabold text-[#005a43]">{total}</span>
              </button>
            ))}
            <div className="mt-5 rounded-xl bg-gradient-to-br from-[#005a43] to-[#004a35] p-4 text-white shadow-xl shadow-emerald-900/25 border border-emerald-400/20 animate-slide-up">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-bold text-emerald-100">{active.totalLabel}</span>
                <span className="text-2xl font-black tracking-tight">{active.total}</span>
              </div>
              <button
                type="button"
                className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-white text-sm font-extrabold text-[#005a43] transition-smooth hover:bg-emerald-50 hover:shadow-lg hover:shadow-emerald-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 active:scale-95"
              >
                {active.button}
              </button>
            </div>
          </div>

          {/* Right Panel - Analytics */}
          <div className={`p-5 sm:p-6 transition-smooth ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {/* Stats Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {active.stats.map(([label, value], index) => (
                <button
                  key={label}
                  type="button"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                  className="rounded-xl border border-emerald-100 bg-white p-4 text-left transition-smooth hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/10 hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 animate-slide-up group"
                >
                  <p className="text-[11px] font-bold text-zinc-500 group-hover:text-emerald-600 transition-smooth">{label}</p>
                  <p className="mt-1 text-xl font-black bg-gradient-to-r from-[#005a43] to-emerald-600 bg-clip-text text-transparent">{value}</p>
                </button>
              ))}
            </div>

            {/* Chart Panel */}
            <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
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
                    style={{
                      animationDelay: `${index * 40}ms`,
                      height: `${Math.max(height - 16, 25)}%`,
                    }}
                    className="flex flex-1 items-end rounded-t-lg bg-emerald-50 transition-smooth hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 group animate-slide-up"
                    aria-label={`${active.panelTitle} bar ${index + 1}`}
                  >
                    <span
                      className="w-full rounded-t-lg bg-gradient-to-t from-[#005a43] to-emerald-500 group-hover:from-emerald-600 group-hover:to-emerald-400 transition-smooth"
                      style={{ height: `${height}%` }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Cards */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {active.cards.map(([title, text, Icon], index) => (
                <button
                  key={title as string}
                  type="button"
                  style={{
                    animationDelay: `${200 + index * 100}ms`,
                  }}
                  className="rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-4 text-left transition-smooth hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/10 hover:border-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 group animate-slide-up"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 group-hover:bg-gradient-to-br group-hover:from-emerald-200 group-hover:to-emerald-100 transition-smooth">
                    <Icon className="h-5 w-5 text-[#005a43]" aria-hidden="true" />
                  </div>
                  <p className="mt-3 text-sm font-extrabold text-zinc-950">{title as string}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500 group-hover:text-zinc-600 transition-smooth">{text as string}</p>
                </button>
              ))}
            </div>

            {/* Info Banner */}
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-emerald-50/50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-sm hover:shadow-md transition-smooth animate-slide-up" style={{ animationDelay: '400ms' }}>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              </div>
              Click tabs to explore every POS & BOS workflow in action.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
