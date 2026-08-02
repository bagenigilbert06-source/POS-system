import type { ElementType, ReactNode } from 'react'

export function DashboardPageHeading({ icon: Icon, eyebrow = 'Pesaby workspace', title, description, action }: { icon: ElementType; eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-[rgba(255,214,10,0.1)] bg-[rgba(255,255,255,0.03)] p-6 shadow-dark-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,214,10,0.2)] bg-[rgba(255,214,10,0.1)] text-[#ffd60a]"><Icon className="h-6 w-6" aria-hidden="true" /></div>
        <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#ffd60a]">{eyebrow}</p><h1 className="mt-1 text-xl font-bold tracking-tight text-[#f5f5f7] sm:text-2xl">{title}</h1><p className="mt-1 text-sm text-[#a1a1a6]">{description}</p></div>
      </div>
      {action}
    </header>
  )
}
