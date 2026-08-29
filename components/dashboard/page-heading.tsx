import type { ElementType, ReactNode } from 'react'

export function DashboardPageHeading({ icon: Icon, eyebrow = 'Pesaby workspace', title, description, action, theme = 'light' }: { icon: ElementType; eyebrow?: string; title: string; description: string; action?: ReactNode; theme?: 'light' | 'dark' | 'adaptive' | 'pos' }) {
  return (
    <header data-theme={theme} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--dashboard-accent)]">{eyebrow}</p><h1 className="mt-0.5 text-xl font-bold tracking-tight text-[var(--dashboard-text)] sm:text-2xl">{title}</h1><p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">{description}</p></div>
      </div>
      {action}
    </header>
  )
}
