import { desc, eq } from 'drizzle-orm'
import { CircleCheck, Clock3, MapPin, MonitorSmartphone } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { TerminalPrinterSettings } from '@/components/admin/terminal-printer-settings'
import { requireDashboardPermission } from '@/lib/auth/dashboard-access'
import { db } from '@/lib/db'
import { branch, businessSettings, posTerminal, user } from '@/lib/db/schema'
import { getTerminal } from '@/lib/pos/pos-auth'
import { PermissionEnum } from '@/lib/types/permissions'

export default async function DevicesPage() {
  const authorization = await requireDashboardPermission(PermissionEnum.ADMIN_ACCESS)
  const [devices, currentTerminal, [settings]] = await Promise.all([
    db.select({
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
      .orderBy(desc(posTerminal.createdAt)),
    getTerminal(),
    db.select({
      receiptBusinessName: businessSettings.receiptBusinessName,
      displayName: businessSettings.displayName,
    }).from(businessSettings)
      .where(eq(businessSettings.organizationId, authorization.organizationId))
      .limit(1),
  ])

  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader title="POS devices" description="Registered terminals and their assigned branches." />
      {devices.length ? (
        <section className="space-y-4">
          {devices.map((device) => {
            const currentDevice = device.id === currentTerminal?.id
            return (
              <article key={device.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[var(--dashboard-surface)]">
                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.5fr)]">
                  <div className="border-b border-slate-100 pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5 dark:border-white/10">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff1f0] text-[#d92d20]"><MonitorSmartphone className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-base font-semibold text-slate-950 dark:text-white">{device.name}</h2>
                          {currentDevice && <span className="rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-semibold text-[#d92d20]">Current device</span>}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{device.branchName}</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-2 text-xs text-slate-500">
                      <p className="flex items-center gap-2"><CircleCheck className="h-3.5 w-3.5 text-emerald-600" /><span className="capitalize text-slate-700 dark:text-slate-300">{device.status}</span></p>
                      <p className="flex items-start gap-2"><Clock3 className="mt-0.5 h-3.5 w-3.5" /><span>Last seen<br /><span className="text-slate-700 dark:text-slate-300">{device.lastSeenAt.toLocaleString('en-KE')}</span></span></p>
                    </div>
                  </div>
                  <TerminalPrinterSettings
                    currentDevice={currentDevice}
                    terminal={{
                      ...device,
                      branchName: device.branchName,
                      businessName: settings?.receiptBusinessName || settings?.displayName || undefined,
                    }}
                  />
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted"><MonitorSmartphone className="h-5 w-5 text-muted-foreground" /></span>
          <p className="mt-3 text-sm font-semibold">No POS devices registered</p>
          <p className="mt-1 text-xs text-muted-foreground">Terminals will appear here after registration.</p>
        </section>
      )}
    </div>
  )
}
