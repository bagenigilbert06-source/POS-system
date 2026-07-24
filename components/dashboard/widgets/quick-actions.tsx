import Link from 'next/link'
import { ArrowRight, BarChart3, Boxes, Package, Plus, ReceiptText, Settings, Users } from 'lucide-react'

interface QuickAction {
  id: string
  label: string
  description: string
  href: string
  icon: React.ReactNode
  badge?: string
  primary?: boolean
}

interface QuickActionsProps {
  actions: QuickAction[]
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Quick actions</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Frequently used features</p>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={
              action.primary
                ? 'group relative flex items-start gap-3 rounded-lg border border-transparent bg-gradient-to-br from-[#ffda32] to-[#f0c900] p-4 transition-all hover:shadow-md'
                : 'group relative flex items-start gap-3 rounded-lg border border-[#e3e8ee] bg-white p-4 transition-all hover:border-[#c7cdd8] hover:bg-[#f8f9fb]'
            }
          >
            <div
              className={
                action.primary
                  ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-[#050a1f]/10 text-[#050a1f]'
                  : 'flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3f5f7] text-[#667085]'
              }
            >
              {action.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className={action.primary ? 'text-sm font-semibold text-[#050a1f]' : 'text-sm font-semibold text-[#101828]'}>
                  {action.label}
                </p>
                {action.badge && (
                  <span className="inline-flex items-center rounded-full bg-[#e42527] px-2 py-0.5 text-[0.65rem] font-bold text-white flex-shrink-0">
                    {action.badge}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[#667085]">{action.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#667085] transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </article>
  )
}
