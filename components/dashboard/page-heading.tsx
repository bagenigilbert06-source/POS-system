import type { ElementType, ReactNode } from 'react'

export function DashboardPageHeading({ icon: Icon, eyebrow = 'Pesaby workspace', title, description, action }: { icon: ElementType; eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-[#eadfbd] bg-[#fffdf7] p-6 shadow-[0_2px_8px_rgba(16,24,40,.04)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#ead38a] bg-[#fff3bd] text-[#8a6500]"><Icon className="h-6 w-6" aria-hidden="true" /></div>
        <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a47700]">{eyebrow}</p><h1 className="mt-1 text-xl font-bold tracking-tight text-[#101828] sm:text-2xl">{title}</h1><p className="mt-1 text-sm text-[#667085]">{description}</p></div>
      </div>
      {action}
    </header>
  )
}
