import { eq } from 'drizzle-orm'
import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { db } from '@/lib/db'
import { branch, businessSettings, cardTerminal, organization } from '@/lib/db/schema'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { EditableSettings } from '@/components/settings/editable-settings'
import { CardTerminalSettings } from '@/components/settings/card-terminal-settings'

const methods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
] as const

export default async function PaymentMethodsPage() {
  const authorization = await requireDashboardPermission(PermissionEnum.ADMIN_ACCESS)
  const [[record], [settings], branches, terminals] = await Promise.all([
    db.select().from(organization).where(eq(organization.id, authorization.organizationId)).limit(1),
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, authorization.organizationId)).limit(1),
    db.select({ id: branch.id, name: branch.name }).from(branch).where(eq(branch.organizationId, authorization.organizationId)).orderBy(branch.name),
    db.select().from(cardTerminal).where(eq(cardTerminal.organizationId, authorization.organizationId)).orderBy(cardTerminal.name),
  ])
  if (!record) return null
  const enabled = Array.isArray(settings?.paymentMethods) ? settings.paymentMethods as string[] : ['cash']
  const action = <EditableSettings businessSettings={settings ?? null} organization={record} buttonOnly section="operating" />

  return <div className="space-y-5 pb-8">
    <AdminPageHeader title="Payment methods" description="Control the payment options available at checkout and choose the default method." action={action} />
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm">
        <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3 text-left">Payment method</th><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Availability</th><th className="px-4 py-3 text-left">Default</th></tr></thead>
        <tbody className="divide-y">{methods.map(({ value, label, icon: Icon }) => <tr key={value}><td className="px-4 py-3"><span className="flex items-center gap-3 font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><Icon className="h-4 w-4" /></span>{label}</span></td><td className="px-4 py-3 font-mono text-xs uppercase text-muted-foreground">{value}</td><td className="px-4 py-3"><span className={enabled.includes(value) ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground'}>{enabled.includes(value) ? 'Enabled' : 'Disabled'}</span></td><td className="px-4 py-3">{settings?.defaultPaymentMethod === value || (!settings?.defaultPaymentMethod && value === 'cash') ? 'Yes' : '—'}</td></tr>)}</tbody>
      </table></div>
    </section>
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="p-4"><h2 className="font-semibold">Physical card terminals</h2><p className="mt-1 text-xs text-muted-foreground">Only active terminals assigned to the cashier&apos;s branch appear at checkout.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="border-y bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3 text-left">Terminal</th><th className="px-4 py-3 text-left">Code</th><th className="px-4 py-3 text-left">Branch</th><th className="px-4 py-3 text-left">Provider</th><th className="px-4 py-3 text-left">RRN</th><th className="px-4 py-3 text-left">Status</th></tr></thead><tbody className="divide-y">{terminals.map((terminal) => <tr key={terminal.id}><td className="px-4 py-3 font-semibold">{terminal.name}</td><td className="px-4 py-3 font-mono text-xs">{terminal.terminalCode}</td><td className="px-4 py-3">{branches.find((item) => item.id === terminal.branchId)?.name ?? '—'}</td><td className="px-4 py-3">{terminal.provider || '—'}</td><td className="px-4 py-3">{terminal.referenceRequired ? 'Required' : 'Optional'}</td><td className="px-4 py-3">{terminal.isActive ? 'Active' : 'Inactive'}</td></tr>)}{terminals.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No card terminals configured.</td></tr>}</tbody></table></div>
      <CardTerminalSettings branches={branches} />
    </section>
  </div>
}
