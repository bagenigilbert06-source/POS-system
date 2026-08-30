import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { eq, sql } from 'drizzle-orm'
import {
  Building2,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { branch, businessSettings, organization } from '@/lib/db/schema'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { EditableSettings } from '@/components/settings/editable-settings'

function label(value: string | null | undefined) {
  if (!value) return 'Not configured'
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function financialYearStartLabel(value: string | null | undefined) {
  if (!value || !/^\d{2}-\d{2}$/.test(value)) return '1 July'
  const [month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(2024, month - 1, day)).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

export default async function AdminProfilePage() {
  const authorization = await requireDashboardPermission(
    PermissionEnum.ADMIN_ACCESS
  )
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [[record], [settings], [locationCount]] = await Promise.all([
    db
      .select()
      .from(organization)
      .where(eq(organization.id, authorization.organizationId))
      .limit(1),
    db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, authorization.organizationId))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)` })
      .from(branch)
      .where(eq(branch.organizationId, authorization.organizationId)),
  ])
  if (!record) redirect('/onboarding')

  const operations = (settings?.operations ?? {}) as Record<string, unknown>

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Business profile"
        description="Manage your workspace identity, operating defaults, receipts and account settings from one place."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminSettingsCard
          icon={Building2}
          title="Business information"
          description="Identity and location details used throughout Pesaby."
          action={
            <EditableSettings
              businessSettings={settings ?? null}
              organization={record}
              buttonOnly
              section="business"
            />
          }
        >
          <Value label="Business name" value={settings?.displayName || record.name} />
          <Value label="Business family" value={label(record.businessType)} />
          <Value
            label="Category"
            value={settings?.customBusinessCategory || label(record.businessCategory)}
          />
          <Value label="Business size" value={label(record.businessSize)} />
          <Value label="Locations" value={String(Number(locationCount?.count ?? 0))} />
          <Value
            label="Location"
            value={
              [settings?.city, settings?.region, record.country]
                .filter(Boolean)
                .join(', ') || 'Not configured'
            }
          />
        </AdminSettingsCard>

        <AdminSettingsCard
          id="operating-configuration"
          icon={CreditCard}
          title="Operating defaults"
          description="Currency, payments, tax and reporting preferences."
          action={
            <EditableSettings
              businessSettings={settings ?? null}
              organization={record}
              buttonOnly
              section="operating"
            />
          }
        >
          <Value label="Currency" value={record.currency} />
          <Value label="Timezone" value={record.timezone || 'Africa/Nairobi'} />
          <Value
            label="Financial year starts"
            value={financialYearStartLabel(settings?.financialYearStart)}
          />
          <Value label="Default payment" value={label(settings?.defaultPaymentMethod)} />
          <Value
            label="Tax"
            value={
              settings?.taxEnabled
                ? `${settings.taxName || 'Tax'} · ${settings.taxRate}%`
                : 'Not enabled'
            }
          />
          <Value
            label="Receipts"
            value={
              operations.issuesReceipts === false
                ? 'Not enabled'
                : label(settings?.receiptNumbering || 'automatic')
            }
          />
        </AdminSettingsCard>

        <AdminSettingsCard
          icon={ReceiptText}
          title="Receipt configuration"
          description="Appearance and information printed after each sale."
          action={
            <EditableSettings
              businessSettings={settings ?? null}
              organization={record}
              buttonOnly
              section="receipt"
            />
          }
        >
          <Value
            label="Receipt layout"
            value={
              settings?.receiptLayout === 'thermal'
                ? 'Thermal printer'
                : 'Detailed receipt'
            }
          />
          <Value
            label="Thermal template"
            value={
              settings?.receiptTemplate === 'cafe'
                ? 'Café'
                : settings?.receiptTemplate === 'logo'
                  ? 'Logo'
                  : 'Classic'
            }
          />
          <Value
            label="Receipt name"
            value={
              settings?.receiptBusinessName ||
              settings?.displayName ||
              record.name
            }
          />
          <Value
            label="Payment details"
            value={settings?.receiptShowPayment ? 'Shown' : 'Hidden'}
          />
          <Value
            label="QR code"
            value={settings?.receiptShowQrCode ? 'Shown' : 'Hidden'}
          />
        </AdminSettingsCard>

        <AdminSettingsCard
          icon={UserRound}
          title="Account"
          description="Your administrator identity for this workspace."
          action={
            <EditableSettings
              businessSettings={settings ?? null}
              organization={record}
              accountName={session.user.name || ''}
              buttonOnly
              section="account"
            />
          }
        >
          <Value label="Name" value={session.user.name || 'Not configured'} />
          <Value label="Work email" value={session.user.email} />
          <Value label="Workspace access" value="Authenticated administrator" />
        </AdminSettingsCard>

        <AdminSettingsCard
          icon={ShieldCheck}
          title="Security and control"
          description="Authentication and organization-level safeguards."
          action={
            <Link
              href="/dashboard/admin/security"
              className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-semibold shadow-sm transition-colors hover:bg-muted"
            >
              Review security
            </Link>
          }
          className="xl:col-span-2"
        >
          <Status text="Secure authenticated sessions" />
          <Status text="Organization-scoped business records" />
          <Status text="Role and permission enforcement" />
        </AdminSettingsCard>
      </div>
    </div>
  )
}

function AdminSettingsCard({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  id,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={`overflow-hidden rounded-lg border bg-card ${className}`}>
      <div className="flex items-start gap-3 border-b px-4 py-4 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      <div className="divide-y px-4 sm:px-5">{children}</div>
    </section>
  )
}

function Value({ label: title, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground">{title}</span>
      <span className="max-w-[62%] text-right text-sm font-semibold">{value}</span>
    </div>
  )
}

function Status({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-3 text-sm font-medium">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      {text}
    </div>
  )
}
