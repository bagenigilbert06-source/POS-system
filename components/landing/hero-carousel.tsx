'use client'

import { memo, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'
import {
  IconArrowRight,
  IconBuildingStore,
  IconChartBar,
  IconCheck,
  IconCreditCard,
  IconReceipt,
  IconPackage,
  IconUsers,
  IconWallet,
  IconLayoutDashboard,
  IconSearch,
  IconBell,
  IconSettings,
} from '@tabler/icons-react'

const slides = [
  {
    eyebrow: 'Pesaby workspace',
    title: 'One workspace for every sale, stock movement, and decision.',
    description: 'Connect sales, inventory, expenses, staff, customers, reporting, and branches without stitching together separate tools.',
  },
  {
    eyebrow: 'Connected operations',
    title: 'Run your counter and your back office in sync.',
    description: 'Every sale updates stock, payments stay tied to transactions, and reports reflect what is happening across the business.',
  },
  {
    eyebrow: 'Built for your team',
    title: 'A clearer way to run pharmacy and liquor operations.',
    description: 'Standardize access, monitor performance, transfer stock, and keep each team working from the same reliable information.',
  },
]

const metrics = [
  { label: 'Net sales', value: 'KES 84,250', note: 'Today', icon: IconReceipt, color: 'bg-emerald-50 text-emerald-700' },
  { label: 'Operating expenses', value: 'KES 12,480', note: 'Today', icon: IconWallet, color: 'bg-red-50 text-[#b42318]' },
  { label: 'Stock alerts', value: '6 items', note: 'Needs review', icon: IconPackage, color: 'bg-blue-50 text-blue-700' },
  { label: 'Team on shift', value: '8 people', note: '2 locations', icon: IconUsers, color: 'bg-red-50 text-[#e42527]' },
]

const activityChartData = [
  { label: 'New', value: 22 },
  { label: '', value: 38 },
  { label: '', value: 30 },
  { label: '', value: 56 },
  { label: 'Returning', value: 44 },
  { label: '', value: 72 },
  { label: '', value: 48 },
  { label: '', value: 86 },
  { label: '', value: 62 },
  { label: '', value: 78 },
  { label: '', value: 52 },
  { label: 'Loyal', value: 68 },
]

const clientRelationshipData = [
  { label: 'New', profiles: 24, visits: 18, loyalty: 8 },
  { label: 'Known', profiles: 38, visits: 28, loyalty: 16 },
  { label: 'Returning', profiles: 52, visits: 42, loyalty: 30 },
  { label: 'Loyal', profiles: 68, visits: 56, loyalty: 46 },
]

const missionProgressData = [
  { label: 'Clarity', value: 32 },
  { label: '', value: 41 },
  { label: 'Connection', value: 52 },
  { label: '', value: 61 },
  { label: '', value: 69 },
  { label: 'Impact', value: 82 },
]

const inventoryHealthData = [
  { subject: 'Availability', value: 84 },
  { subject: 'Movement', value: 68 },
  { subject: 'Reorder', value: 76 },
  { subject: 'Coverage', value: 62 },
  { subject: 'Control', value: 80 },
]

const teamRoleData = [
  { name: 'Cashiers', value: 42, color: '#e42527' },
  { name: 'Supervisors', value: 28, color: '#ffda32' },
  { name: 'Managers', value: 18, color: '#111827' },
  { name: 'Owners', value: 12, color: '#f1a4a4' },
]

function ActivityChart({ client, inventory, team }: { client: boolean; inventory: boolean; team: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3" role="img" aria-label={`${inventory ? 'Inventory health' : team ? 'Team roles' : client ? 'Client activity' : 'Illustrative sales activity'} chart`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-900">{inventory ? 'Inventory health' : team ? 'Team roles' : client ? 'Client activity' : 'Sales activity'}</p><p className="mt-1 text-[10px] text-slate-500">{inventory ? 'Coverage and movement across your stock.' : team ? 'Clear access across every role.' : client ? 'Follow relationships and service moments.' : 'See daily movement at a glance.'}</p></div><span className="rounded-md border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500">{inventory ? 'Stock view' : team ? 'Access view' : client ? 'Relationship view' : '30 days'}</span></div>
      <div className="mt-3 h-24"><ResponsiveContainer width="100%" height="100%">{inventory ? <RadarChart data={inventoryHealthData} outerRadius="72%"><PolarGrid stroke="#edf0f4" /><PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: '#98a2b3' }} /><PolarRadiusAxis tick={false} axisLine={false} /><Tooltip contentStyle={{ border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 10, padding: '5px 8px' }} /><Radar name="Inventory health" dataKey="value" stroke="#e42527" fill="#e42527" fillOpacity={0.18} dot={{ r: 2, fill: '#ffda32' }} /></RadarChart> : team ? <RadialBarChart innerRadius="22%" outerRadius="92%" barSize={10} data={teamRoleData} startAngle={90} endAngle={-270}><RadialBar background={{ fill: '#f3f5f7' }} dataKey="value" cornerRadius={6}>{teamRoleData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</RadialBar><Tooltip contentStyle={{ border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 10, padding: '5px 8px' }} /></RadialBarChart> : client ? <BarChart data={clientRelationshipData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 8, fill: '#98a2b3' }} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: '#fff7f7' }} contentStyle={{ border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 10, padding: '5px 8px' }} /><Bar dataKey="profiles" name="Profiles" fill="#e42527" radius={[3, 3, 0, 0]} /><Bar dataKey="visits" name="Visits" fill="#ffda32" radius={[3, 3, 0, 0]} /><Bar dataKey="loyalty" name="Loyalty" fill="#111827" radius={[3, 3, 0, 0]} /></BarChart> : <AreaChart data={activityChartData} margin={{ top: 4, right: 2, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 9, fill: '#98a2b3' }} tickLine={false} axisLine={false} /><Tooltip cursor={{ stroke: '#e42527', strokeDasharray: '3 3' }} contentStyle={{ border: '1px solid #e2e6ec', borderRadius: 8, fontSize: 10, padding: '5px 8px' }} /><Area type="monotone" dataKey="value" stroke="#e42527" strokeWidth={2.5} fill="#e42527" fillOpacity={0.1} dot={{ r: 2.5, fill: '#ffda32', stroke: '#e42527', strokeWidth: 1.5 }} activeDot={{ r: 4, fill: '#e42527' }} /></AreaChart>}</ResponsiveContainer></div>
      <div className="mt-2 flex justify-between text-[9px] text-slate-400">{team ? <><span>Roles</span><span>Access</span><span>People</span></> : client ? <><span>New</span><span>Returning</span><span>Loyal</span></> : <><span>Start</span><span>Midpoint</span><span>Today</span></>}</div>
    </div>
  )
}

const DashboardPreview = memo(function DashboardPreview() {
  const [activeView, setActiveView] = useState('Dashboard')
  const nav = [[IconLayoutDashboard, 'Dashboard'], [IconCheck, 'Mission'], [IconUsers, 'Clients'], [IconPackage, 'Inventory'], [IconBuildingStore, 'Team'], [IconChartBar, 'Impact']] as const
  const workflowItems = [['01', 'Clarity', 'See what matters', 'Our focus'], ['02', 'Connection', 'One shared workspace', 'Our focus'], ['03', 'Control', 'Make better decisions', 'Our focus']] as const
  const views: Record<string, readonly [string, string, string, string, string, string, string, string]> = {
    Dashboard: ['Pesaby overview', 'Our mission', 'Simple operations', 'For every business', 'One clear workspace', 'Connected tools', 'Built around people', 'Ready to grow'],
    Mission: ['Our mission', 'Make work clearer', 'Less admin, more focus', 'Built for owners', 'Control in one place', 'Better decisions', 'From counter to office', 'Progress together'],
    Clients: ['Client experience', 'Client records', 'Organised relationships', 'Service history', 'Every interaction matters', 'Loyalty & care', 'Know your clients', 'Trust built daily'],
    Inventory: ['Inventory workspace', 'Stock items', 'Products & pricing', 'Stock movements', 'Receive & transfer', 'Batch control', 'Pharmacy-ready', 'Low-stock controls'],
    Team: ['Team workspace', 'Staff access', 'Clear permissions', 'Shared responsibilities', 'Role-based control', 'Shift visibility', 'Work better together', 'Secure by design'],
    Impact: ['Business impact', 'Daily clarity', 'See what matters', 'Useful insights', 'Decisions from data', 'Branch visibility', 'Measure progress', 'Keep moving forward'],
  }
  const view = views[activeView]
  return (
    <div className="relative mx-auto w-full max-w-[1200px]" aria-label="Pesaby business dashboard preview">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-white/35 blur-3xl" aria-hidden="true" />
      <div className="grid overflow-hidden rounded-2xl border border-slate-200/90 bg-[#f5f8fa] shadow-[0_42px_110px_-42px_rgba(15,23,42,0.55)] sm:grid-cols-[128px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white p-3 sm:flex sm:flex-col" aria-label="Dashboard preview navigation">
          <div className="flex items-center gap-2 px-2 py-2"><PesabyLogoMark className="h-8 w-8" /><span className="text-sm font-bold text-slate-950">Pesaby</span></div>
          <nav className="mt-4 space-y-1">{nav.map(([Icon, label]) => <button type="button" key={label} onClick={() => setActiveView(label)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] ${activeView === label ? 'bg-[#e42527] text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
          <div className="mt-auto flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold text-slate-500"><IconSettings className="h-4 w-4" />Settings</div>
        </aside>

        <div className="min-w-0 overflow-hidden">
          <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="flex min-w-0 flex-1 gap-4 overflow-x-auto text-[11px] font-semibold [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5">{['Dashboard', 'Mission', 'Clients', 'Impact'].map(label => <button type="button" key={label} onClick={() => setActiveView(label)} className={`shrink-0 border-b-2 py-1 transition-colors ${activeView === label ? 'border-[#e42527] text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-950'}`}>{label}</button>)}</div>
            <div className="ml-2 flex shrink-0 items-center gap-2 sm:gap-3"><div className="hidden h-8 items-center gap-2 rounded-lg bg-slate-100 px-3 text-[10px] text-slate-400 md:flex"><IconSearch className="h-3.5 w-3.5" />Search</div><IconBell className="h-4 w-4 text-slate-500" /><div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffda32] text-[10px] font-bold text-slate-950">AM</div></div>
          </header>

          <div className="p-3 sm:p-4">
            <div key={activeView} className="animate-fade-up"><div className="mb-3 flex items-end justify-between"><div><h3 className="text-lg font-bold text-slate-950">{view[0]}</h3><p className="text-[10px] text-slate-500">All branches · Today, 10:45 AM</p></div><span className="rounded-full bg-[#fff6cc] px-2.5 py-1 text-[9px] font-bold text-[#8a6100]">Live workspace</span></div>
            <div className="grid gap-3 lg:grid-cols-[0.68fr_1.15fr_0.72fr]">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1"><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold text-slate-500">{view[1]}</p><p className="mt-1 text-lg font-bold text-slate-950">{view[2]}</p><p className="mt-1 text-[9px] font-bold text-[#e42527]">Ready in your workspace</p></div><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold text-slate-500">{view[3]}</p><p className="mt-1 text-lg font-bold text-slate-950">{view[4]}</p><p className="mt-1 text-[9px] font-bold text-[#e42527]">Built into Pesaby</p></div></div>
              {activeView === 'Mission' ? <div className="rounded-xl border border-slate-200 bg-white p-3" role="img" aria-label="Mission progress trend chart"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-900">Mission momentum</p><p className="mt-1 text-[10px] text-slate-500">How Pesaby turns its principles into progress.</p></div><span className="rounded-md border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500">This quarter</span></div><div className="mt-3 h-24"><ResponsiveContainer width="100%" height="100%"><LineChart data={missionProgressData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf0f4" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 8, fill: "#98a2b3" }} tickLine={false} axisLine={false} /><Tooltip cursor={{ stroke: "#e42527", strokeDasharray: "3 3" }} contentStyle={{ border: "1px solid #e2e6ec", borderRadius: 8, fontSize: 10, padding: "5px 8px" }} /><Line type="monotone" dataKey="value" stroke="#e42527" strokeWidth={3} dot={{ r: 3.5, fill: "#ffda32", stroke: "#e42527", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#e42527" }} /></LineChart></ResponsiveContainer></div><div className="mt-1 flex justify-between text-[9px] text-slate-400"><span>Clarity</span><span>Connection</span><span>Impact</span></div></div> : <ActivityChart client={activeView === 'Clients'} inventory={activeView === 'Inventory'} team={activeView === 'Team'} />}
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-bold text-slate-900">Built for your business</p><div className="mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-full border-[10px] border-[#ffda32] border-r-slate-900 border-t-[#e42527] text-xs font-bold text-slate-950">Pesaby</div><div className="mt-3 space-y-1 text-[9px] text-slate-500"><p className="flex justify-between"><span>Pharmacy workflows</span><b className="text-slate-800">Ready</b></p><p className="flex justify-between"><span>Liquor store workflows</span><b className="text-slate-800">Ready</b></p></div></div>
            </div>
            {activeView === 'Mission' && <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]"><div className="rounded-xl border border-[#f1caca] bg-[#fff7f7] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e42527]">The Pesaby promise</p><p className="mt-3 max-w-md text-sm font-bold leading-6 text-slate-900">Give every growing business the clarity and control to do its best work.</p><div className="mt-4 flex items-center gap-2 text-[9px] font-semibold text-slate-500"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#e42527]"/>Clear tools</span><span className="h-px w-8 bg-[#e42527]/40"/><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#ffda32]"/>Connected teams</span><span className="h-px w-8 bg-[#e42527]/40"/><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-900"/>Better decisions</span></div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-900">How we work</p><span className="text-[9px] font-semibold text-[#e42527]">Our values</span></div><div className="mt-3 space-y-3">{[['01', 'Listen first', 'Build around real work'], ['02', 'Keep it clear', 'Remove unnecessary steps'], ['03', 'Grow together', 'Make progress visible']].map(([id, title, detail]) => <div key={id} className="flex items-start gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fff6cc] text-[8px] font-bold text-[#8a6100]">{id}</span><div><p className="text-[10px] font-bold text-slate-800">{title}</p><p className="text-[9px] text-slate-500">{detail}</p></div></div>)}</div></div></div>}
            {activeView === 'Clients' && <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]"><div className="rounded-xl border border-[#f1caca] bg-[#fff7f7] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e42527]">Client care</p><p className="mt-3 max-w-md text-sm font-bold leading-6 text-slate-900">Make every client feel known, valued, and supported at every visit.</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-white p-2"><p className="text-[9px] text-slate-500">Profiles</p><p className="mt-1 text-xs font-bold text-slate-900">Organised</p></div><div className="rounded-lg bg-white p-2"><p className="text-[9px] text-slate-500">History</p><p className="mt-1 text-xs font-bold text-slate-900">Connected</p></div><div className="rounded-lg bg-white p-2"><p className="text-[9px] text-slate-500">Loyalty</p><p className="mt-1 text-xs font-bold text-slate-900">Personal</p></div></div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-900">Relationship journey</p><span className="text-[9px] font-semibold text-[#e42527]">Client view</span></div><div className="mt-4 flex items-center justify-between"><div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#fff6cc] text-[10px] font-bold text-[#8a6100]">1</span><p className="mt-1 text-[9px] text-slate-500">Discover</p></div><span className="h-px flex-1 bg-[#e42527]/30"/><div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#e42527] text-[10px] font-bold text-white">2</span><p className="mt-1 text-[9px] text-slate-500">Serve</p></div><span className="h-px flex-1 bg-[#e42527]/30"/><div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">3</span><p className="mt-1 text-[9px] text-slate-500">Return</p></div></div><p className="mt-4 text-[9px] leading-4 text-slate-500">Keep client context close to the people serving them.</p></div></div>}
            {activeView === 'Inventory' && <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]"><div className="rounded-xl border border-[#f1caca] bg-[#fff7f7] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e42527]">Stock confidence</p><p className="mt-3 max-w-md text-sm font-bold leading-6 text-slate-900">Know what is available, what is moving, and what needs attention before it becomes a problem.</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-white p-2"><p className="text-[9px] text-slate-500">Availability</p><p className="mt-1 text-xs font-bold text-slate-900">Visible</p></div><div className="rounded-lg bg-white p-2"><p className="text-[9px] text-slate-500">Movement</p><p className="mt-1 text-xs font-bold text-slate-900">Tracked</p></div><div className="rounded-lg bg-white p-2"><p className="text-[9px] text-slate-500">Reorders</p><p className="mt-1 text-xs font-bold text-slate-900">Timely</p></div></div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-900">Inventory flow</p><span className="text-[9px] font-semibold text-[#e42527]">Stock view</span></div><div className="mt-4 flex items-center justify-between"><div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#fff6cc] text-[10px] font-bold text-[#8a6100]">1</span><p className="mt-1 text-[9px] text-slate-500">Receive</p></div><span className="h-px flex-1 bg-[#e42527]/30"/><div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#e42527] text-[10px] font-bold text-white">2</span><p className="mt-1 text-[9px] text-slate-500">Organise</p></div><span className="h-px flex-1 bg-[#e42527]/30"/><div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">3</span><p className="mt-1 text-[9px] text-slate-500">Reorder</p></div></div><p className="mt-4 text-[9px] leading-4 text-slate-500">Keep every stock decision connected to the work around it.</p></div></div>}
            {activeView === 'Team' && <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]"><div className="rounded-xl border border-[#f1caca] bg-[#fff7f7] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#e42527]">Team clarity</p><p className="mt-3 max-w-md text-sm font-bold leading-6 text-slate-900">Give every person the access, context, and confidence to do their work well.</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-white p-2"><p className="text-[9px] text-slate-500">Roles</p><p className="mt-1 text-xs font-bold text-slate-900">Clear</p></div><div className="rounded-lg bg-white p-2"><p className="text-[9px] text-slate-500">Access</p><p className="mt-1 text-xs font-bold text-slate-900">Secure</p></div><div className="rounded-lg bg-white p-2"><p className="text-[9px] text-slate-500">Shifts</p><p className="mt-1 text-xs font-bold text-slate-900">Visible</p></div></div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-900">Team workflow</p><span className="text-[9px] font-semibold text-[#e42527]">Access view</span></div><div className="mt-4 flex items-center justify-between"><div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#fff6cc] text-[10px] font-bold text-[#8a6100]">1</span><p className="mt-1 text-[9px] text-slate-500">Assign</p></div><span className="h-px flex-1 bg-[#e42527]/30"/><div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-[#e42527] text-[10px] font-bold text-white">2</span><p className="mt-1 text-[9px] text-slate-500">Support</p></div><span className="h-px flex-1 bg-[#e42527]/30"/><div className="text-center"><span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">3</span><p className="mt-1 text-[9px] text-slate-500">Grow</p></div></div><p className="mt-4 text-[9px] leading-4 text-slate-500">Keep permissions and daily responsibilities easy to understand.</p></div></div>}
            <div className={activeView === 'Mission' || activeView === 'Clients' || activeView === 'Inventory' || activeView === 'Team' ? 'hidden' : 'mt-3 grid gap-3 lg:grid-cols-[1.65fr_0.75fr]'}>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3"><div className="flex justify-between"><p className="text-xs font-bold text-slate-900">What Pesaby brings</p><span className="text-[9px] font-semibold text-[#e42527]">Our approach</span></div><div className="mt-2 divide-y divide-slate-100">{workflowItems.map(([id, module, detail, status]) => <div key={id} className="grid grid-cols-[0.35fr_1.15fr_1fr_0.8fr] items-center gap-2 py-2 text-[9px]"><span className="font-semibold text-slate-400">{id}</span><span className="truncate font-semibold text-slate-700">{module}</span><span className="truncate text-slate-500">{detail}</span><span className="w-fit rounded-full bg-[#fff6cc] px-2 py-0.5 font-bold text-[#8a6100]">{status}</span></div>)}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs font-bold text-slate-900">Principles in practice</p><div className="mt-2 space-y-2">{[['Simple', 'Clear tools for daily work'], ['Connected', 'One source of truth'], ['Practical', 'Useful for every team']].map(([item, detail]) => <div key={item} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2"><div className="min-w-0"><p className="truncate text-[9px] font-semibold text-slate-800">{item}</p><p className="text-[8px] text-slate-400">{detail}</p></div><IconCheck className="h-3.5 w-3.5 shrink-0 text-[#e42527]" aria-hidden="true" /></div>)}</div></div>
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
      className="relative isolate overflow-hidden border-b border-[var(--dashboard-border)] bg-white font-sans"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false)
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(#334155 0.7px, transparent 0.7px)', backgroundSize: '20px 20px' }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[64%] bg-gradient-to-b from-white via-[#ffe5e5] to-[#e42527]/70" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-[1050px] flex-col items-stretch px-5 py-10 sm:px-6 sm:py-12 lg:px-0 lg:py-14 xl:py-16">
        <div className="relative z-10 w-full text-left">
          <div aria-live="polite">
            <div key={slides[selected].title} className="animate-fade-up">
              <p className="inline-flex items-center border-l-2 border-[#e42527] pl-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--dashboard-accent)]">{slides[selected].eyebrow}</p>
              <h1 className="mt-3 max-w-[48rem] text-xl font-bold leading-tight tracking-tight text-[var(--dashboard-text)] sm:text-2xl">{slides[selected].title}</h1>
              <p className="mt-3 max-w-[39rem] text-sm leading-6 text-[var(--dashboard-muted)]">{slides[selected].description}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-start gap-2 sm:flex-row">
            <Link href="/sign-up" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#e42527] px-4 text-xs font-bold text-white shadow-[0_8px_18px_-10px_rgba(142,20,22,0.7)] transition hover:bg-[#c91f21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2">Get started <IconArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            <Link href="mailto:hello@pesaby.com?subject=Pesaby%20product%20demo" className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-4 text-xs font-bold text-[var(--dashboard-text)] shadow-sm transition hover:border-slate-400 hover:bg-[var(--dashboard-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2">Book a Demo</Link>
          </div>

          <div className="mt-7 flex items-center justify-start gap-3" role="group" aria-label="Hero slides">
            {slides.map((slide, index) => <button key={slide.title} type="button" onClick={() => select(index)} className={`h-1.5 rounded-full transition-[width,background-color] duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2 motion-reduce:transition-none ${selected === index ? 'w-8 bg-[#e42527]' : 'w-3 bg-slate-300 hover:bg-red-300'}`} aria-label={`Show message ${index + 1}`} aria-current={selected === index ? 'true' : undefined} />)}
          </div>
        </div>

        <div className="relative z-10 mt-12 w-full lg:mt-14"><DashboardPreview /></div>
      </div>
    </section>
  )
}
