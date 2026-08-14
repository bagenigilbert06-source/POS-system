import { eq } from 'drizzle-orm'
import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { db } from '@/lib/db'
import { businessSettings, organization } from '@/lib/db/schema'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { EditableSettings } from '@/components/settings/editable-settings'

const methods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
] as const

export default async function PaymentMethodsPage() {
  const authorization = await requireDashboardPermission(PermissionEnum.ADMIN_ACCESS)
  const [[record], [settings]] = await Promise.all([
    db.select().from(organization).where(eq(organization.id, authorization.organizationId)).limit(1),
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, authorization.organizationId)).limit(1),
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
  </div>
}
