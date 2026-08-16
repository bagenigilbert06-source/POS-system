import type { Metadata } from 'next'
import { ShieldCheck, FileCheck2, Clock3, UserCheck } from 'lucide-react'
import { getComplianceOverview } from '@/app/actions/compliance'
import { DashboardPageHeading } from '@/components/dashboard/page-heading'
import { requireAnyPermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'

export const metadata: Metadata = { title: 'Compliance' }
export const dynamic = 'force-dynamic'

function dateLabel(value: Date | null) {
  return value ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(value) : '—'
}

export default async function CompliancePage() {
  await requireAnyPermission([PermissionEnum.AUDIT_LOG_VIEW, PermissionEnum.SETTINGS_VIEW])
  const { licenses, verifications, hours } = await getComplianceOverview()
  const expiring = licenses.filter((license) => license.computedStatus !== 'active')

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
      <DashboardPageHeading icon={ShieldCheck} title="Compliance" description="Keep age checks, licenses, and alcohol sale rules audit-ready." theme="adaptive" />

      {expiring.length > 0 && (
        <section className="rounded-xl border border-amber-300/40 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100" aria-label="Compliance alerts">
          <p className="font-semibold">{expiring.length} license{expiring.length === 1 ? '' : 's'} need attention</p>
          <p className="mt-1 text-sm">Review expiry dates and upload renewed documents before your permits lapse.</p>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5"><FileCheck2 className="mb-4 size-5 text-primary" /><p className="text-sm text-muted-foreground">Active licenses</p><p className="mt-1 text-3xl font-semibold">{licenses.filter((license) => license.computedStatus === 'active').length}</p></div>
        <div className="rounded-xl border bg-card p-5"><UserCheck className="mb-4 size-5 text-primary" /><p className="text-sm text-muted-foreground">ID checks logged</p><p className="mt-1 text-3xl font-semibold">{verifications.length}</p></div>
        <div className="rounded-xl border bg-card p-5"><Clock3 className="mb-4 size-5 text-primary" /><p className="text-sm text-muted-foreground">Sale-hour rules</p><p className="mt-1 text-3xl font-semibold">{hours.filter((rule) => rule.enabled).length}</p></div>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-5"><h2 className="text-xl font-semibold">License & permit tracker</h2><p className="mt-1 text-sm text-muted-foreground">Active, expiring soon, and expired business documents.</p></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">License</th><th className="px-5 py-3">Number</th><th className="px-5 py-3">Authority</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y">{licenses.length ? licenses.map((license) => <tr key={license.id}><td className="px-5 py-4 font-medium">{license.name}</td><td className="px-5 py-4">{license.licenseNumber}</td><td className="px-5 py-4">{license.issuingAuthority}</td><td className="px-5 py-4">{dateLabel(license.expiryDate)}</td><td className="px-5 py-4"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{license.computedStatus.replace('_', ' ')}</span></td></tr>) : <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No licenses recorded yet.</td></tr>}</tbody></table></div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-5"><h2 className="text-xl font-semibold">ID-check audit log</h2><p className="mt-1 text-sm text-muted-foreground">Every alcohol sale verification is traceable to a cashier and timestamp.</p></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Transaction</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Verification</th></tr></thead><tbody className="divide-y">{verifications.length ? verifications.map((check) => <tr key={check.id}><td className="px-5 py-4">{dateLabel(check.createdAt)}</td><td className="px-5 py-4 font-mono text-xs">{check.transactionId || 'Pending checkout'}</td><td className="px-5 py-4 capitalize">{check.method}</td><td className="px-5 py-4">{check.verified ? 'ID verified' : 'Rejected'}</td></tr>) : <tr><td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">No age checks have been logged yet.</td></tr>}</tbody></table></div>
      </section>
    </div>
  )
}
