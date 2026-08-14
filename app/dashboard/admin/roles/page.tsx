import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { ASSIGNABLE_ROLES, ROLE_PERMISSIONS, RoleEnum } from '@/lib/types/permissions'

export const metadata: Metadata = { title: 'Role permissions | Pesaby' }

const visibleRoles = [RoleEnum.OWNER, RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.SUPERVISOR, RoleEnum.CASHIER, RoleEnum.INVENTORY, RoleEnum.ACCOUNTANT]
const roleSummary: Record<string, string> = {
  owner: 'Owns the business account and retains the highest-risk controls.',
  admin: 'Configures and administers the whole organization.',
  manager: 'Runs assigned branches and their day-to-day operations.',
  supervisor: 'Controls registers, shifts and floor exceptions.',
  cashier: 'Sells, handles customers and views their own receipts.',
  inventory: 'Maintains products, stock and procurement records.',
  accountant: 'Reviews finance, expenses and organization reports.',
}

export default function RolesPage() {
  return <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-8"><DashboardPageHeading icon={ShieldCheck} title="Roles & permission policy" description="Review the enforced system roles. Managers cannot promote themselves or grant administrative access." theme="adaptive" /><section className="grid gap-4 lg:grid-cols-2">{visibleRoles.map((role) => <article key={role} className="app-panel overflow-hidden"><div className="border-b p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold capitalize">{role}</h2><span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">{ROLE_PERMISSIONS[role].length} permissions</span></div><p className="mt-2 text-sm text-muted-foreground">{roleSummary[role]}</p></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Can create or assign</p><p className="mt-2 text-sm">{ASSIGNABLE_ROLES[role].length ? ASSIGNABLE_ROLES[role].map(label).join(', ') : 'No roles'}</p><div className="mt-4 flex flex-wrap gap-1.5">{ROLE_PERMISSIONS[role].map((permission) => <span key={permission} className="rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-medium">{label(permission)}</span>)}</div></div></article>)}</section></div>
}

function label(value: string) { return value.replace(/[:_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
