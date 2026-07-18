import type { ElementType, ReactNode } from 'react'

export function DashboardPageHeading({ icon: Icon, eyebrow = 'Pesaby workspace', title, description, action }: { icon: ElementType; eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 rounded-xl border border-[#e3dfd2] bg-[#fffdf7] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#ffda32] text-[#050a1f]"><Icon className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e42527]">{eyebrow}</p><h1 className="mt-0.5 text-xl font-extrabold tracking-[-0.025em] text-[#050a1f] sm:text-2xl">{title}</h1><p className="mt-1 text-sm text-[#667085]">{description}</p></div>
      </div>
      {action}
    </header>
  )
}
