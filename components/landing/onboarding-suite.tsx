'use client'

import { useState } from 'react'
import {
  IconBuildingStore,
  IconBulb,
  IconChartBar,
  IconDatabaseImport,
  IconPlugConnected,
  IconReceipt,
  IconShieldCheck,
  IconUsers,
  IconWallet,
  IconCheck,
  IconChevronRight,
} from '@tabler/icons-react'

const steps = [
  { title: 'Import and configure', icon: IconDatabaseImport, text: 'Bring in products, stock counts, customers, suppliers, and branch settings. Configure taxes, payments, and receipts around the way your business already works.' },
  { title: 'Administer user access', icon: IconUsers, text: 'Invite your team, assign responsibilities, and control what cashiers, managers, accountants, and owners can view or change.' },
  { title: 'Integrate and expand', icon: IconPlugConnected, text: 'Connect payment workflows, devices, branches, and the services your operation depends on without rebuilding your core records.' },
  { title: 'Improve and automate', icon: IconBulb, text: 'Use alerts, approvals, reports, and connected workflows to remove repetitive administration and keep the business moving.' },
]

const capabilities = [
  { icon: IconReceipt, label: 'Sales & payments', detail: 'Receipts and tills' },
  { icon: IconWallet, label: 'Expenses & cash', detail: 'Cash flow in one view' },
  { icon: IconBuildingStore, label: 'Stock & branches', detail: 'Live movement tracking' },
  { icon: IconUsers, label: 'Team & customers', detail: 'Roles and relationships' },
  { icon: IconChartBar, label: 'Reports & insights', detail: 'Business-wide visibility' },
  { icon: IconShieldCheck, label: 'Controls & approvals', detail: 'Clear accountability' },
]

export function OnboardingSuite() {
  const [active, setActive] = useState(0)

  return (
    <section id="concierge" className="scroll-mt-20 border-y border-black/10 bg-white py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e42527]">From setup to smarter operations</p>
          <h2 className="mt-4 text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl">Bring your whole business into one clear system.</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Pesaby connects the work your team does every day, so every sale, stock update, expense, customer, and branch contributes to the same business picture.</p>
        </div>

        <div className="mt-16 grid items-center gap-14 lg:grid-cols-[0.94fr_1.06fr] lg:gap-24">
          <div className="border-b border-slate-300">
            {steps.map((step, index) => {
              const Icon = step.icon
              const selected = active === index
              return (
                <div key={step.title} className={`border-t border-slate-300 transition-colors duration-300 motion-reduce:transition-none ${selected ? 'bg-[#f8f4e9]' : 'bg-transparent'}`}>
                  <button type="button" onClick={() => setActive(index)} aria-expanded={selected} className="flex w-full items-center gap-4 px-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e42527] sm:px-5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${selected ? 'border-[#e42527] bg-[#e42527] text-white' : 'border-slate-300 bg-white text-slate-600'}`}>{index + 1}</span>
                    <Icon className={`h-5 w-5 shrink-0 ${selected ? 'text-[#e42527]' : 'text-slate-500'}`} aria-hidden="true" />
                    <span className="text-lg font-bold text-slate-950 sm:text-xl">{step.title}</span>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${selected ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden"><p className="pb-7 pl-16 pr-5 text-sm leading-7 text-slate-600 sm:pl-[4.75rem] sm:text-base">{step.text}</p></div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mx-auto w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f9f8] shadow-[0_28px_80px_-38px_rgba(15,23,42,0.38)]" aria-label={`${steps[active].title} business workspace preview`}>
            <div className="grid h-1 grid-cols-3" aria-hidden="true"><span className="bg-[#e42527]" /><span className="bg-[#ffda32]" /><span className="bg-slate-950" /></div>
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-[#ffda32]">P</div>
                <div><p className="text-sm font-bold text-slate-950">Your business workspace</p><p className="text-xs text-slate-500">Everything connected in Pesaby</p></div>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-[#fff6cc] px-3 py-1.5 text-xs font-bold text-slate-950 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#e42527]" />Live</span>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between rounded-xl border border-[#ecd36a] bg-[#fff8dc] px-4 py-3">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-[#9a6500]">Current step</p><p className="mt-0.5 text-sm font-bold text-slate-950">{steps[active].title}</p></div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffda32] text-slate-950 shadow-sm"><IconCheck className="h-5 w-5" /></div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {capabilities.map((item, index) => {
                  const Icon = item.icon
                  const highlighted = index === active || index === active + 2
                  return <div key={item.label} className={`group flex items-center gap-3 rounded-xl border bg-white p-3.5 transition-all duration-300 motion-reduce:transition-none ${highlighted ? 'border-[#e42527]/50 shadow-sm' : 'border-slate-200'}`}>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${highlighted ? 'bg-[#e42527] text-white' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1"><p className="text-[13px] font-bold leading-4 text-slate-900 sm:text-sm">{item.label}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:text-xs">{item.detail}</p></div>
                    <IconChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                })}
              </div>

              <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white py-3 text-center">
                <div><p className="text-base font-bold text-slate-950">One</p><p className="text-[11px] text-slate-500">source of truth</p></div>
                <div><p className="text-base font-bold text-slate-950">Live</p><p className="text-[11px] text-slate-500">business view</p></div>
                <div><p className="text-base font-bold text-slate-950">Clear</p><p className="text-[11px] text-slate-500">team control</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
