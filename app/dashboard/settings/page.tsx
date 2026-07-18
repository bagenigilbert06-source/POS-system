import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { eq, sql } from 'drizzle-orm'
import { Building2, CircleCheck, CreditCard, Settings, ShieldCheck, UserRound } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { branch, businessSettings } from '@/lib/db/schema'
import { OrganizationService } from '@/lib/services/organization-service'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'

export const metadata: Metadata = { title: 'Workspace settings | Pesaby' }

function label(value: string | null | undefined) {
  if (!value) return 'Not configured'
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default async function SettingsPage() {
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
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <DashboardPageHeading icon={Settings} title="Workspace settings" description="Review the business configuration applied during setup." />

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsCard icon={Building2} title="Business profile">
          <Value label="Business name" value={settings?.displayName || organization.name} />
          <Value label="Business family" value={label(organization.businessType)} />
          <Value label="Category" value={settings?.customBusinessCategory || label(organization.businessCategory)} />
          <Value label="Locations" value={String(Number(locationCount?.count ?? 0))} />
          <Value label="Location" value={[settings?.city, organization.country].filter(Boolean).join(', ') || 'Not configured'} />
        </SettingsCard>

        <SettingsCard icon={CreditCard} title="Operating defaults">
          <Value label="Currency" value={organization.currency} />
          <Value label="Timezone" value={organization.timezone || 'Africa/Nairobi'} />
          <Value label="Default payment" value={label(settings?.defaultPaymentMethod)} />
          <Value label="Tax" value={settings?.taxEnabled ? `${settings.taxName || 'Tax'} · ${settings.taxRate}%` : 'Not enabled'} />
          <Value label="Receipts" value={operations.issuesReceipts === false ? 'Not enabled' : label(settings?.receiptNumbering || 'automatic')} />
        </SettingsCard>

        <SettingsCard icon={UserRound} title="Account">
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

function SettingsCard({ icon: Icon, title, children }: { icon: typeof Settings; title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-[#dde1e8] bg-white"><div className="flex items-center gap-3 border-b border-[#e7e9ee] px-4 py-4 sm:px-5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff3be] text-[#050a1f]"><Icon className="h-4 w-4" /></span><h2 className="font-extrabold text-[#050a1f]">{title}</h2></div><div className="divide-y divide-[#eceef2] px-4 sm:px-5">{children}</div></section>
}

function Value({ label: title, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 py-3.5"><span className="text-sm text-[#667085]">{title}</span><span className="max-w-[60%] text-right text-sm font-bold text-[#050a1f]">{value}</span></div>
}

function Status({ text }: { text: string }) {
  return <div className="flex items-center gap-3 py-3 text-sm font-semibold text-[#344054]"><CircleCheck className="h-4 w-4 shrink-0 text-[#e42527]" />{text}</div>
}
