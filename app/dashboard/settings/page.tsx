import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { eq, sql } from 'drizzle-orm'
import { Building2, CircleCheck, CreditCard, ReceiptText, Settings, ShieldCheck, UserRound } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { branch, businessSettings } from '@/lib/db/schema'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { EditableSettings } from '@/components/settings/editable-settings'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'

export const metadata: Metadata = { title: 'Workspace settings | Pesaby' }

function label(value: string | null | undefined) {
  if (!value) return 'Not configured'
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function financialYearStartLabel(value: string | null | undefined) {
  if (!value || !/^\d{2}-\d{2}$/.test(value)) return '1 July'
  const [month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(2024, month - 1, day)).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

export default async function SettingsPage() {
  await requireDashboardPermission(PermissionEnum.SETTINGS_VIEW)
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')

  const [[settings], [locationCount]] = await Promise.all([
    db.select().from(businessSettings).where(eq(businessSettings.organizationId, organization.id)).limit(1),
    db.select({ count: sql<number>`count(*)` }).from(branch).where(eq(branch.organizationId, organization.id)),
  ])
  const operations = (settings?.operations ?? {}) as Record<string, unknown>

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6">
      <DashboardPageHeading
        icon={Settings}
        title="Workspace settings"
        description="Review the business configuration applied during setup."
        theme="adaptive"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsCard icon={Building2} title="Business profile" action={<EditableSettings businessSettings={settings ?? null} organization={organization} buttonOnly section="business" />}>
          <Value label="Business name" value={settings?.displayName || organization.name} />
          <Value label="Business family" value={label(organization.businessType)} />
          <Value label="Category" value={settings?.customBusinessCategory || label(organization.businessCategory)} />
          <Value label="Business size" value={label(organization.businessSize)} />
          <Value label="Locations" value={String(Number(locationCount?.count ?? 0))} />
          <Value label="Location" value={[settings?.city, organization.country].filter(Boolean).join(', ') || 'Not configured'} />
        </SettingsCard>

        <SettingsCard icon={CreditCard} title="Operating defaults" action={<EditableSettings businessSettings={settings ?? null} organization={organization} buttonOnly section="operating" />}>
          <Value label="Currency" value={organization.currency} />
          <Value label="Timezone" value={organization.timezone || 'Africa/Nairobi'} />
          <Value label="Financial year starts" value={financialYearStartLabel(settings?.financialYearStart)} />
          <Value label="Default payment" value={label(settings?.defaultPaymentMethod)} />
          <Value label="Tax" value={settings?.taxEnabled ? `${settings.taxName || 'Tax'} · ${settings.taxRate}%` : 'Not enabled'} />
          <Value label="Receipts" value={operations.issuesReceipts === false ? 'Not enabled' : label(settings?.receiptNumbering || 'automatic')} />
        </SettingsCard>

        <SettingsCard icon={ReceiptText} title="Receipt configuration" description="Controls the appearance and information printed after each sale." action={<EditableSettings businessSettings={settings ?? null} organization={organization} buttonOnly section="receipt" />}>
          <Value label="Receipt layout" value={settings?.receiptLayout === 'thermal' ? 'Thermal printer' : 'Detailed receipt'} />
          <Value label="Thermal template" value={settings?.receiptTemplate === 'cafe' ? 'Café' : settings?.receiptTemplate === 'logo' ? 'Logo' : 'Classic'} />
          <Value label="Receipt name" value={settings?.receiptBusinessName || settings?.displayName || organization.name} />
          <Value label="Payment details" value={settings?.receiptShowPayment ? 'Shown' : 'Hidden'} />
          <Value label="QR code" value={settings?.receiptShowQrCode ? 'Shown' : 'Hidden'} />
          <p className="px-4 pb-4 pt-1 text-xs leading-5 text-[var(--dashboard-muted)] sm:px-5">Edit Settings to choose a compact thermal receipt and control the details printed for customers.</p>
        </SettingsCard>

        <SettingsCard icon={UserRound} title="Account" action={<EditableSettings businessSettings={settings ?? null} organization={organization} accountName={session.user.name || ''} buttonOnly section="account" />}>
          <Value label="Name" value={session.user.name || 'Not configured'} />
          <Value label="Work email" value={session.user.email} />
          <Value label="Workspace access" value="Authenticated" />
        </SettingsCard>

        <SettingsCard icon={ShieldCheck} title="Security and control">
          <Status text="Secure authenticated session" />
          <Status text="Organization-scoped business records" />
          <Status text="Workspace modules controlled by setup" />
          <p className="pt-2 text-xs leading-5 text-[#7c8799]">Sensitive changes should be made by an authorized workspace owner. Editable administration controls will only appear when persistence and permission checks are available.</p>
        </SettingsCard>
      </div>
    </div>
  )
}

function SettingsCard({ icon: Icon, title, description, action, children }: { icon: typeof Settings; title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_8px_24px_rgba(0,0,0,.08)]"><div className="flex items-start gap-3 border-b border-[var(--dashboard-border)] px-4 py-4 sm:px-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#f1d66a]/40 bg-[#fff3be] text-[#8a6500] dark:border-[rgba(255,214,10,.18)] dark:bg-[rgba(255,214,10,.1)] dark:text-[#ffd60a]"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h2 className="font-bold tracking-tight text-[var(--dashboard-text)]">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-[var(--dashboard-muted)]">{description}</p>}</div>{action}</div><div className="divide-y divide-[var(--dashboard-border)] px-4 sm:px-5">{children}</div></section>
}

function Value({ label: title, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 py-3.5"><span className="text-sm text-[var(--dashboard-muted)]">{title}</span><span className="max-w-[60%] text-right text-sm font-semibold text-[var(--dashboard-text)]">{value}</span></div>
}

function Status({ text }: { text: string }) {
  return <div className="flex items-center gap-3 py-3 text-sm font-medium text-[var(--dashboard-text)]"><CircleCheck className="h-4 w-4 shrink-0 text-[#e42527]" />{text}</div>
}
