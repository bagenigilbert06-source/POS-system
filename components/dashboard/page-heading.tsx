import type { ElementType, ReactNode } from 'react'

export function DashboardPageHeading({ icon: Icon, eyebrow = 'Pesaby workspace', title, description, action, theme = 'light' }: { icon: ElementType; eyebrow?: string; title: string; description: string; action?: ReactNode; theme?: 'light' | 'dark' | 'adaptive' | 'pos' }) {
  const dark = theme === 'dark'
  const adaptive = theme === 'adaptive'
  const pos = theme === 'pos'

  return (
    <header className={dark
      ? 'flex flex-col gap-4 rounded-2xl border border-[rgba(255,214,10,0.2)] bg-[#101010] p-6 shadow-[0_2px_8px_rgba(0,0,0,.18)] sm:flex-row sm:items-center sm:justify-between'
      : adaptive
      ? 'flex flex-col gap-4 rounded-2xl border border-[#ead28a] bg-gradient-to-r from-[#fffdf7] via-[#fff9e5] to-[#fff1b8] p-6 shadow-[0_2px_8px_rgba(151,112,0,.08)] dark:border-[rgba(255,214,10,0.22)] dark:from-[#15130c] dark:via-[#201b0d] dark:to-[#30270f] dark:shadow-[0_2px_8px_rgba(0,0,0,.18)] sm:flex-row sm:items-center sm:justify-between'
    : pos ? 'flex flex-col gap-4 rounded-xl border border-[#e6e8ec] bg-white p-6 shadow-[0_2px_8px_rgba(16,24,40,.05)] dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between' : 'flex flex-col gap-4 rounded-2xl border border-[#eadfbd] bg-gradient-to-r from-[#fffdf7] via-[#fffdf7] to-[#fff8d6] p-6 shadow-[0_2px_8px_rgba(16,24,40,.04)] sm:flex-row sm:items-center sm:justify-between'}>
      <div className="flex min-w-0 items-center gap-4">
        <div className={pos ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#ffd8c7] bg-[#fff2eb] text-[#f15a24] dark:border-orange-900 dark:bg-orange-950/40' : dark || adaptive ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgba(255,214,10,0.2)] bg-[rgba(255,214,10,0.1)] text-[#ffd60a] dark:border-[rgba(255,214,10,0.2)] dark:bg-[rgba(255,214,10,0.1)]' : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#ead38a] bg-[#fff3bd] text-[#8a6500]'}><Icon className="h-6 w-6" aria-hidden="true" /></div>
        <div className="min-w-0"><p className={pos ? 'text-[11px] font-bold uppercase tracking-[0.14em] text-[#f15a24]' : dark || adaptive ? 'text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--dashboard-accent)]' : 'text-[11px] font-bold uppercase tracking-[0.14em] text-[#a47700]'}>{eyebrow}</p><h1 className={pos ? 'mt-1 text-xl font-bold tracking-tight text-[#172033] dark:text-white sm:text-2xl' : dark || adaptive ? 'mt-1 text-xl font-bold tracking-tight text-[var(--dashboard-text)] sm:text-2xl' : 'mt-1 text-xl font-bold tracking-tight text-[#101828] sm:text-2xl'}>{title}</h1><p className={pos ? 'mt-1 text-sm text-[#667085] dark:text-slate-400' : dark || adaptive ? 'mt-1 text-sm text-[var(--dashboard-muted)]' : 'mt-1 text-sm text-[#667085]'}>{description}</p></div>
      </div>
      {action}
    </header>
  )
}
