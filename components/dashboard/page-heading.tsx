import type { ElementType, ReactNode } from 'react'

export function DashboardPageHeading({ icon: Icon, eyebrow = 'Pesaby workspace', title, description, action }: { icon: ElementType; eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-[#e1e6db] bg-white p-5 shadow-[0_8px_24px_rgba(35,37,34,.05)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#efffd0] text-[#557b14]"><Icon className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b8270]">{eyebrow}</p><h1 className="mt-0.5 text-xl font-bold tracking-[-0.035em] text-[#151514] sm:text-2xl">{title}</h1><p className="mt-1 text-sm text-[#74776f]">{description}</p></div>
      </div>
      {action}
    </header>
  )
}
