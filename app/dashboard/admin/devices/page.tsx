import { desc, eq } from 'drizzle-orm'
import { MonitorSmartphone } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { db } from '@/lib/db'
import { branch, businessSettings, posTerminal, user } from '@/lib/db/schema'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { PermissionEnum } from '@/lib/types/permissions'
import { TerminalPrinterSettings } from '@/components/admin/terminal-printer-settings'
import { getTerminal } from '@/lib/pos/pos-auth'

export default async function DevicesPage() {
  const authorization = await requireDashboardPermission(PermissionEnum.ADMIN_ACCESS)
  const [devices, currentTerminal, [settings]] = await Promise.all([db.select({
    id: posTerminal.id,
    name: posTerminal.name,
    status: posTerminal.status,
    branchName: branch.name,
    registeredBy: user.name,
    createdAt: posTerminal.createdAt,
    lastSeenAt: posTerminal.lastSeenAt,
    printingMode: posTerminal.printingMode,
    printerDisplayName: posTerminal.printerDisplayName,
    printerIdentifier: posTerminal.printerIdentifier,
    paperWidth: posTerminal.paperWidth,
    autoPrint: posTerminal.autoPrint,
    receiptCopies: posTerminal.receiptCopies,
    cashDrawerPulse: posTerminal.cashDrawerPulse,
  }).from(posTerminal)
    .innerJoin(branch, eq(branch.id, posTerminal.branchId))
    .leftJoin(user, eq(user.id, posTerminal.registeredBy))
    .where(eq(posTerminal.organizationId, authorization.organizationId))
    .orderBy(desc(posTerminal.createdAt)), getTerminal(), db.select({ receiptBusinessName: businessSettings.receiptBusinessName, displayName: businessSettings.displayName }).from(businessSettings).where(eq(businessSettings.organizationId, authorization.organizationId)).limit(1)])

  return <div className="space-y-5 pb-8">
    <AdminPageHeader title="POS devices" description="Registered terminals and their assigned branches." />
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3 text-left">Device</th><th className="px-4 py-3 text-left">Branch</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Receipt printer</th><th className="px-4 py-3 text-left">Last seen</th></tr></thead>
          <tbody className="divide-y">{devices.map((device) => <tr key={device.id}><td className="px-4 py-3 font-semibold">{device.name}{device.id === currentTerminal?.id && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Current device</span>}</td><td className="px-4 py-3">{device.branchName}</td><td className="px-4 py-3 capitalize">{device.status}</td><td className="min-w-[360px] px-4 py-3"><TerminalPrinterSettings terminal={{ ...device, branchName: device.branchName, businessName: settings?.receiptBusinessName || settings?.displayName || undefined }} /></td><td className="px-4 py-3 text-muted-foreground">{device.lastSeenAt.toLocaleString('en-KE')}</td></tr>)}</tbody>
        </table>
      </div>
      {!devices.length && <div className="flex min-h-60 flex-col items-center justify-center p-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted"><MonitorSmartphone className="h-5 w-5 text-muted-foreground" /></span><p className="mt-3 text-sm font-semibold">No POS devices registered</p><p className="mt-1 text-xs text-muted-foreground">Terminals will appear here after registration.</p></div>}
    </section>
  </div>
}
