'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'
import {
  IconArrowRight,
  IconBuildingStore,
  IconChartBar,
  IconCheck,
  IconCreditCard,
  IconPackage,
  IconReceipt,
  IconUsers,
  IconWallet,
  IconLayoutDashboard,
  IconClipboardList,
  IconSearch,
  IconBell,
  IconSettings,
} from '@tabler/icons-react'

const slides = [
  {
    eyebrow: 'One system for the whole business',
    title: 'Run every part of your business from one clear workspace.',
    description: 'Connect sales, inventory, expenses, staff, customers, reporting, and branches without stitching together separate tools.',
  },
  {
    eyebrow: 'Operations that stay connected',
    title: 'Move from daily activity to better decisions.',
    description: 'Every sale updates stock, payments stay tied to transactions, and reports reflect what is happening across the business.',
  },
  {
    eyebrow: 'Built to grow with you',
    title: 'Manage one location or your entire branch network.',
    description: 'Standardize access, monitor performance, transfer stock, and keep each team working from the same reliable information.',
  },
]

const metrics = [
  { label: 'Net sales', value: 'KES 84,250', note: 'Today', icon: IconReceipt, color: 'bg-emerald-50 text-emerald-700' },
  { label: 'Operating expenses', value: 'KES 12,480', note: 'Today', icon: IconWallet, color: 'bg-[#fff6cc] text-[#9a6500]' },
  { label: 'Stock alerts', value: '6 items', note: 'Needs review', icon: IconPackage, color: 'bg-blue-50 text-blue-700' },
  { label: 'Team on shift', value: '8 people', note: '2 locations', icon: IconUsers, color: 'bg-red-50 text-[#e42527]' },
]

const DashboardPreview = memo(function DashboardPreview() {
  const [activeView, setActiveView] = useState('Dashboard')
  const nav = [[IconLayoutDashboard, 'Dashboard'], [IconReceipt, 'Sales'], [IconClipboardList, 'Orders'], [IconUsers, 'Customers'], [IconPackage, 'Inventory'], [IconChartBar, 'Reports']] as const
  const transactions = [['#15432', 'Arabica Coffee', 'KES 1,450', 'Paid'], ['#15431', 'Fresh Pastries', 'KES 2,800', 'Pending'], ['#15430', 'House Blend', 'KES 1,950', 'Paid']] as const
  const views: Record<string, readonly [string, string, string, string, string, string, string, string]> = {
    Dashboard: ['Business dashboard', 'Total sales', 'KES 284,500', 'Total orders', '1,247', 'Revenue growth', 'KES 112,900', 'Inventory health'],
    Sales: ['Sales performance', 'Net sales', 'KES 84,250', 'Transactions', '128', 'Sales by hour', 'KES 84,250', 'Payment mix'],
    Orders: ['Order management', 'Completed orders', '118', 'Open orders', '10', 'Order volume', '128 today', 'Order status'],
    Customers: ['Customer overview', 'Active customers', '6,891', 'Returning customers', '64%', 'Customer activity', '86 visits', 'Customer mix'],
    Inventory: ['Inventory control', 'Stock value', 'KES 4.8M', 'Low-stock items', '6', 'Stock movement', '342 units', 'Inventory health'],
    Reports: ['Business reports', 'Gross margin', '31.4%', 'Reports ready', '8', 'Performance trend', '+12.4%', 'Business health'],
  }
  const view = views[activeView]
  return (
    <div className="relative mx-auto w-full max-w-[850px]" aria-label="Pesaby business dashboard preview">
      <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-white/30 blur-3xl" aria-hidden="true" />
      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-[#f5f8fa] shadow-[0_32px_85px_-34px_rgba(15,23,42,0.45)] sm:grid-cols-[118px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white p-3 sm:flex sm:flex-col" aria-label="Dashboard preview navigation">
          <div className="flex items-center gap-2 px-2 py-2"><PesabyLogoMark className="h-8 w-8" /><span className="text-sm font-bold text-slate-950">Pesaby</span></div>
          <nav className="mt-4 space-y-1">{nav.map(([Icon, label]) => <button type="button" key={label} onClick={() => setActiveView(label)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] ${activeView === label ? 'bg-[#e42527] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
          <div className="mt-auto flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold text-slate-500"><IconSettings className="h-4 w-4" />Settings</div>
        </aside>

        <div className="min-w-0 overflow-hidden">
          <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="flex min-w-0 flex-1 gap-4 overflow-x-auto text-[11px] font-semibold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5">{['Dashboard', 'Sales', 'Inventory', 'Reports'].map(label => <button type="button" key={label} onClick={() => setActiveView(label)} className={`shrink-0 border-b-2 py-1 transition-colors ${activeView === label ? 'border-[#e42527] text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-950'}`}>{label}</button>)}</div>
            <div className="ml-2 flex shrink-0 items-center gap-2 sm:gap-3"><div className="hidden h-8 items-center gap-2 rounded-lg bg-slate-100 px-3 text-[10px] text-slate-400 md:flex"><IconSearch className="h-3.5 w-3.5" />Search</div><IconBell className="h-4 w-4 text-slate-500" /><div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffda32] text-[10px] font-bold text-slate-950">AM</div></div>
          </header>

          <div className="p-3 sm:p-4">
            <div key={activeView} className="animate-fade-up"><div className="mb-3 flex items-end justify-between"><div><h3 className="text-lg font-bold text-slate-950">{view[0]}</h3><p className="text-[10px] text-slate-500">All branches · Today, 10:45 AM</p></div><span className="rounded-full bg-[#fff6cc] px-2.5 py-1 text-[9px] font-bold text-slate-950">Live data</span></div>
            <div className="grid gap-3 lg:grid-cols-[0.68fr_1.15fr_0.72fr]">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1"><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold text-slate-500">{view[1]}</p><p className="mt-1 text-lg font-bold text-slate-950">{view[2]}</p><p className="mt-1 text-[9px] font-bold text-[#e42527]">+12.4% this week</p></div><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold text-slate-500">{view[3]}</p><p className="mt-1 text-lg font-bold text-slate-950">{view[4]}</p><p className="mt-1 text-[9px] font-bold text-[#e42527]">+8.1% this week</p></div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex justify-between"><div><p className="text-xs font-bold text-slate-900">Revenue growth</p><p className="mt-1 text-lg font-bold text-slate-950">KES 112,900</p></div><span className="text-[9px] text-slate-400">7 days</span></div><svg viewBox="0 0 300 100" className="mt-2 h-24 w-full" role="img" aria-label="Revenue rising over seven days"><defs><linearGradient id="dashboardArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e42527" stopOpacity=".34"/><stop offset="1" stopColor="#e42527" stopOpacity=".03"/></linearGradient></defs><path d="M4 82 C38 77 48 72 74 70 S112 47 138 53 S180 64 205 55 S250 35 296 12 L296 94 L4 94Z" fill="url(#dashboardArea)"/><path d="M4 82 C38 77 48 72 74 70 S112 47 138 53 S180 64 205 55 S250 35 296 12" fill="none" stroke="#e42527" strokeWidth="3" strokeLinecap="round"/></svg></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-bold text-slate-900">Inventory health</p><div className="mx-auto mt-3 h-20 w-20 rounded-full" style={{ background: 'conic-gradient(#ffda32 0 68%, #111827 68% 92%, #e42527 92% 100%)' }}><div className="relative left-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xs font-bold">92%</div></div><div className="mt-3 space-y-1 text-[9px] text-slate-500"><p className="flex justify-between"><span>Healthy stock</span><b className="text-slate-800">68%</b></p><p className="flex justify-between"><span>Low stock</span><b className="text-slate-800">24%</b></p></div></div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.65fr_0.75fr]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3"><div className="flex justify-between"><p className="text-xs font-bold text-slate-900">Recent transactions</p><span className="text-[9px] font-semibold text-[#e42527]">View all</span></div><div className="mt-2 divide-y divide-slate-100">{transactions.map(([id, product, amount, status]) => <div key={id} className="grid grid-cols-[0.7fr_1.3fr_1fr_0.8fr] items-center gap-2 py-2 text-[9px]"><span className="font-semibold text-slate-600">{id}</span><span className="truncate text-slate-700">{product}</span><span className="font-semibold text-slate-800">{amount}</span><span className={`w-fit rounded-full px-2 py-0.5 font-bold ${status === 'Paid' ? 'bg-slate-950 text-white' : 'bg-[#fff6cc] text-[#8a6100]'}`}>{status}</span></div>)}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-bold text-slate-900">Low-stock alerts</p><div className="mt-2 space-y-2">{[['Arabica beans', '8 left'], ['Paper cups', '5 left'], ['Oat milk', '3 left']].map(([item, count]) => <div key={item} className="flex items-center justify-between gap-2 rounded-lg bg-red-50 p-2"><div className="min-w-0"><p className="truncate text-[9px] font-semibold text-slate-800">{item}</p><p className="text-[8px] text-slate-400">Reorder suggested</p></div><span className="shrink-0 rounded-full bg-[#e42527] px-2 py-0.5 text-[8px] font-bold text-white">{count}</span></div>)}</div></div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export function HeroCarousel() {
  const [selected, setSelected] = useState(0)
  const [paused, setPaused] = useState(false)
  const select = useCallback((index: number) => setSelected(index), [])

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setSelected(current => (current + 1) % slides.length), 7000)
    return () => window.clearInterval(timer)
  }, [paused, selected])

  return (
    <section
      className="relative overflow-hidden border-b border-[#d8b900] bg-[#ffda32]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(#0f172a 0.75px, transparent 0.75px)', backgroundSize: '18px 18px' }} aria-hidden="true" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-white/25 blur-3xl" aria-hidden="true" />
      <div className="mx-auto grid max-w-[1480px] items-center gap-10 px-5 py-12 sm:px-6 sm:py-14 lg:grid-cols-[0.66fr_1.34fr] lg:gap-8 lg:px-8 lg:py-16 xl:py-20">
        <div className="relative z-10">
          <div className="min-h-[390px] sm:min-h-[350px] lg:min-h-[390px]" aria-live="polite">
            <div key={slides[selected].title} className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"><IconCheck className="h-4 w-4 text-[#e42527]" aria-hidden="true" /> {slides[selected].eyebrow}</p>
              <h1 className="mt-5 max-w-2xl text-[2.15rem] font-bold leading-[1.08] tracking-[-0.04em] text-slate-950 min-[380px]:text-4xl sm:text-5xl lg:text-[3rem]">{slides[selected].title}</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-700 sm:text-lg">{slides[selected].description}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#e42527] px-7 text-sm font-bold text-white shadow-lg shadow-red-900/15 transition hover:bg-[#c91f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2">Start Free Trial <IconArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="mailto:hello@pesaby.com?subject=Pesaby%20product%20demo" className="inline-flex h-12 items-center justify-center rounded-md border border-slate-950 bg-white px-7 text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2">Book a Demo</Link>
          </div>

          <div className="mt-7 flex items-center gap-3" role="group" aria-label="Hero slides">
            {slides.map((slide, index) => <button key={slide.title} type="button" onClick={() => select(index)} className={`h-1.5 rounded-full transition-[width,background-color] duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2 motion-reduce:transition-none ${selected === index ? 'w-8 bg-[#e42527]' : 'w-3 bg-slate-300 hover:bg-red-300'}`} aria-label={`Show message ${index + 1}`} aria-current={selected === index ? 'true' : undefined} />)}
          </div>
        </div>

        <div className="relative z-10"><DashboardPreview /></div>
      </div>
    </section>
  )
}
