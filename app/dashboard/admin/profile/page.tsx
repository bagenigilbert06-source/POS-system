import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Building2, CreditCard, MapPin, ReceiptText, UserRound } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { businessSettings, organization } from '@/lib/db/schema'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { EditableSettings } from '@/components/settings/editable-settings'

export default async function AdminProfilePage() {
  const authorization = await requireDashboardPermission(PermissionEnum.ADMIN_ACCESS)
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const [[record], [settings]] = await Promise.all([
    db.select().from(organization).where(eq(organization.id, authorization.organizationId)).limit(1),
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, authorization.organizationId)).limit(1),
  ])
  if (!record) redirect('/onboarding')

  const sections = [
    { icon: Building2, title: 'Business information', detail: settings?.displayName || record.name, section: 'business' as const },
    { icon: MapPin, title: 'Business location', detail: [settings?.city, settings?.region, record.country].filter(Boolean).join(', ') || 'Not configured', section: 'business' as const },
    { icon: CreditCard, title: 'Operating preferences', detail: `${record.currency} · ${record.timezone || 'Africa/Nairobi'}`, section: 'operating' as const },
    { icon: ReceiptText, title: 'Receipt settings', detail: settings?.receiptLayout === 'detailed' ? 'Detailed receipt' : 'Thermal receipt', section: 'receipt' as const },
    { icon: UserRound, title: 'Account profile', detail: session.user.email, section: 'account' as const },
  ]

  return <div className="space-y-5 pb-8">
    <AdminPageHeader title="Business profile" description="Manage the identity, location and operating preferences used across Pesaby." />
    <section className="overflow-hidden rounded-lg border bg-card">
      {sections.map(({ icon: Icon, title, detail, section }) => <div key={title} className="flex items-center gap-4 border-b px-4 py-4 last:border-b-0 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div>
        <EditableSettings businessSettings={settings ?? null} organization={record} accountName={session.user.name || ''} buttonOnly section={section} />
      </div>)}
    </section>
  </div>
}
