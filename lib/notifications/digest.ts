import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, notificationEvent, notificationPreference, organization } from '@/lib/db/schema'
import { getReportsOverview, getReportShifts } from '@/lib/services/reports-service'
import { generateId } from '@/lib/utils'

function localParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

export function digestIsDue(now: Date, timeZone: string, deliveryTime = '20:00') { return localParts(now, timeZone).time >= deliveryTime }

async function digestTime(organizationId: string, branchId: string | null) {
  if (branchId) {
    const [specific] = await db.select({ value: notificationPreference.digestTime }).from(notificationPreference).where(and(eq(notificationPreference.organizationId, organizationId), eq(notificationPreference.branchId, branchId), eq(notificationPreference.type, 'DAILY_BUSINESS_DIGEST'))).limit(1)
    if (specific) return specific.value
  }
  const [setting] = await db.select({ value: notificationPreference.digestTime }).from(notificationPreference).where(and(eq(notificationPreference.organizationId, organizationId), isNull(notificationPreference.branchId), eq(notificationPreference.type, 'DAILY_BUSINESS_DIGEST'))).limit(1)
  return setting?.value ?? '20:00'
}

function digestMarkup(input: { business: string; scope: string; date: string; timeZone: string; report: Awaited<ReturnType<typeof getReportsOverview>>; shifts: Awaited<ReturnType<typeof getReportShifts>> }) {
  const money = (value: number) => `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const payment = new Map(input.report.payments.map((item) => [item.method.toLowerCase(), item.amount]))
  const other = input.report.payments.filter((item) => !['cash', 'mpesa', 'card'].includes(item.method.toLowerCase())).reduce((sum, item) => sum + item.amount, 0)
  const lines = [`Daily Business Digest — ${input.scope}`, input.business, input.date, input.timeZone, '', `Net sales: ${money(input.report.totals.revenue)}`, `Transactions: ${input.report.totals.transactions}`, `Average transaction: ${money(input.report.totals.averageSale)}`, `Refunds: ${money(input.report.totals.refunds)}`, '', `Cash: ${money(payment.get('cash') ?? 0)}`, `M-Pesa: ${money(payment.get('mpesa') ?? 0)}`, `Card: ${money(payment.get('card') ?? 0)}`, `Other: ${money(other)}`, '', `Low stock: ${input.report.inventory.lowStock}`, `Out of stock: ${input.report.inventory.outOfStock}`, `Shifts closed: ${input.shifts.filter((item) => item.status === 'closed').length}`, '', 'Top products:', ...input.report.topProducts.slice(0, 5).map((item) => `${item.name}: ${item.quantity}`), '', `${process.env.BETTER_AUTH_URL || 'https://pesaby.com'}/dashboard`]
  const text = lines.join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;background:#fff;padding:24px;border-top:4px solid #f4bd23"><h1>Daily Business Digest</h1><p><strong>${input.business}</strong><br>${input.scope} · ${input.date} · ${input.timeZone}</p><h2>Sales</h2><p>Net sales: <strong>${money(input.report.totals.revenue)}</strong><br>Transactions: ${input.report.totals.transactions}<br>Average: ${money(input.report.totals.averageSale)}<br>Refunds: ${money(input.report.totals.refunds)}</p><h2>Inventory</h2><p>Low stock: ${input.report.inventory.lowStock}<br>Out of stock: ${input.report.inventory.outOfStock}</p><h2>Top products</h2><ol>${input.report.topProducts.slice(0, 5).map((item) => `<li>${item.name} — ${item.quantity}</li>`).join('')}</ol><a href="${process.env.BETTER_AUTH_URL || 'https://pesaby.com'}/dashboard" style="display:block;padding:13px;background:#e42527;color:white;text-align:center;text-decoration:none">View Dashboard</a></div></body></html>`
  return { subject: `Daily Business Digest — ${input.scope}`, text, html }
}

export async function createDueDigestEvents(now = new Date()) {
  const organizations = await db.select().from(organization)
  let created = 0
  for (const org of organizations) {
    const timezone = org.timezone || 'Africa/Nairobi', period = localParts(now, timezone).date
    if (digestIsDue(now, timezone, await digestTime(org.id, null))) {
      const report = await getReportsOverview(org.id, timezone, { from: period, to: period })
      const shifts = await getReportShifts(org.id, timezone, { from: period, to: period })
      const message = digestMarkup({ business: org.name, scope: 'All branches', date: period, timeZone: timezone, report, shifts })
      const inserted = await db.insert(notificationEvent).values({ id: generateId(), organizationId: org.id, type: 'DAILY_BUSINESS_DIGEST', severity: 'INFO', entityType: 'organization', entityId: org.id, dedupeKey: `daily-digest:organization:${period}`, payload: message }).onConflictDoNothing().returning({ id: notificationEvent.id }); created += inserted.length
    }
    const branches = await db.select().from(branch).where(eq(branch.organizationId, org.id))
    for (const location of branches) {
      const timezone = location.timezone || org.timezone || 'Africa/Nairobi', period = localParts(now, timezone).date
      if (!digestIsDue(now, timezone, await digestTime(org.id, location.id))) continue
      const report = await getReportsOverview(org.id, timezone, { from: period, to: period, branchIds: [location.id] })
      const shifts = await getReportShifts(org.id, timezone, { from: period, to: period, branchIds: [location.id] })
      const message = digestMarkup({ business: org.name, scope: location.name, date: period, timeZone: timezone, report, shifts })
      const inserted = await db.insert(notificationEvent).values({ id: generateId(), organizationId: org.id, branchId: location.id, type: 'DAILY_BUSINESS_DIGEST', severity: 'INFO', entityType: 'branch', entityId: location.id, dedupeKey: `daily-digest:branch:${location.id}:${period}`, payload: message }).onConflictDoNothing().returning({ id: notificationEvent.id }); created += inserted.length
    }
  }
  return created
}
