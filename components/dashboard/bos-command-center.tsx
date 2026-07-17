import Link from 'next/link'
import {
  BarChart3,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  Zap,
} from 'lucide-react'
import type { WorkspaceConfig } from '@/lib/types/workspace'

interface BosCommandCenterProps {
  workspaceConfig: WorkspaceConfig
}

const iconMap = {
  dashboard: LayoutDashboard,
  pos: ReceiptText,
  inventory: PackageCheck,
  reports: BarChart3,
  customers: UsersRound,
  payments: WalletCards,
  security: ShieldCheck,
  document: FileText,
  automation: Zap,
}

function prettyLabel(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function resolveIcon(name?: string) {
  if (!name) return Sparkles
  const key = name.toLowerCase()
  if (key.includes('sale') || key.includes('pos') || key.includes('receipt')) return ReceiptText
  if (key.includes('inventory') || key.includes('product') || key.includes('stock') || key.includes('package')) return PackageCheck
  if (key.includes('report') || key.includes('chart') || key.includes('analytics')) return BarChart3
  if (key.includes('customer') || key.includes('team') || key.includes('user')) return UsersRound
  if (key.includes('payment') || key.includes('wallet')) return WalletCards
  if (key.includes('shield') || key.includes('lock') || key.includes('security')) return ShieldCheck
  return iconMap[key as keyof typeof iconMap] ?? Sparkles
}

export function BosCommandCenter({ workspaceConfig }: BosCommandCenterProps) {
  const { template } = workspaceConfig
  const modules = workspaceConfig.enabledModules.slice(0, 8)
  const quickActions = template.quickActions.filter((action) => modules.some((module) => action.href.includes(`/dashboard/${module}`))).slice(0, 6)
  const reports = template.reports.filter((report) => report.enabled).slice(0, 4)
  const roles = template.permissions.roles.slice(0, 4)
  const settings = template.settings

  const readiness = [
    { label: 'Template applied', value: template.name, icon: CheckCircle2 },
    { label: 'Currency', value: settings.currency, icon: WalletCards },
    { label: 'Timezone', value: settings.timezone.replace('_', ' '), icon: LayoutDashboard },
    { label: 'Owner role', value: prettyLabel(template.permissions.defaultOwnerRole), icon: LockKeyhole },
  ]

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Business OS Command Center</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your workspace modules, controls, reports, and launch tasks in one place.
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
        >
          Configure workspace
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">Launch actions</h3>
              <p className="mt-1 text-sm text-muted-foreground">The fastest paths for daily operations.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#005a43]">
              {template.businessType}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = resolveIcon(action.icon || action.id)
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className={`group rounded-lg border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                    action.primary
                      ? 'border-[#005a43] bg-[#005a43] text-white'
                      : 'border-border bg-[#fbfaf6] text-foreground'
                  }`}
                >
                  <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${
                    action.primary ? 'bg-white/15 text-white' : 'bg-emerald-50 text-[#005a43]'
                  }`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold">{action.label}</p>
                  <p className={`mt-1 text-xs ${action.primary ? 'text-emerald-50/75' : 'text-muted-foreground'}`}>
                    Open {prettyLabel(action.id).toLowerCase()}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-4 shadow-sm sm:p-5">
          <h3 className="font-semibold text-foreground">Workspace readiness</h3>
          <div className="mt-4 space-y-3">
            {readiness.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-center gap-3 rounded-lg bg-[#fbfaf6] px-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-[#005a43]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                    <p className="truncate text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm sm:p-5">
          <h3 className="font-semibold text-foreground">Enabled modules</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {modules.map((module) => (
              <span key={module} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#005a43]">
                {prettyLabel(module)}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-4 shadow-sm sm:p-5">
          <h3 className="font-semibold text-foreground">Reports</h3>
          <div className="mt-4 space-y-3">
            {reports.map((report) => (
              <Link key={report.id} href={report.route} className="block rounded-md border border-border px-3 py-2 transition hover:bg-muted">
                <p className="text-sm font-semibold text-foreground">{report.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{report.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-4 shadow-sm sm:p-5">
          <h3 className="font-semibold text-foreground">Roles and permissions</h3>
          <div className="mt-4 space-y-3">
            {roles.map((role) => (
              <div key={role.role} className="flex items-center justify-between gap-3 rounded-md bg-[#fbfaf6] px-3 py-2">
                <span className="text-sm font-semibold text-foreground">{prettyLabel(role.role)}</span>
                <span className="text-xs font-medium text-muted-foreground">{role.permissions.length} permissions</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  )
}
