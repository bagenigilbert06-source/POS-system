import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { branch, notificationDelivery, notificationEvent, organization } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { inventoryAlertEmail } from '@/lib/email/templates/operational-notification'
import { resolveNotificationRecipients, type NotificationType } from './recipients'

export async function materializeNotificationEvents(limit = 25) {
  const events = await db.select().from(notificationEvent).where(isNull(notificationEvent.materializedAt)).orderBy(notificationEvent.createdAt).limit(limit)
  let created = 0
  for (const event of events) {
    if (!['LOW_STOCK', 'OUT_OF_STOCK', 'DAILY_BUSINESS_DIGEST'].includes(event.type)) continue
    const recipients = await resolveNotificationRecipients({ organizationId: event.organizationId, branchId: event.branchId, type: event.type as NotificationType })
    const [context] = await db.select({ organization: organization.name, branch: branch.name }).from(organization).leftJoin(branch, and(eq(branch.id, event.branchId!), eq(branch.organizationId, organization.id))).where(eq(organization.id, event.organizationId)).limit(1)
    const payload = event.payload as { productName?: string; availableStock?: number; reorderPoint?: number; subject?: string; html?: string; text?: string }
    const message = event.type === 'DAILY_BUSINESS_DIGEST' && payload.subject && payload.html && payload.text ? payload as Required<Pick<typeof payload, 'subject'|'html'|'text'>> : inventoryAlertEmail({ type: event.type as 'LOW_STOCK'|'OUT_OF_STOCK', organization: context?.organization ?? 'Business', branch: context?.branch ?? 'Location', product: payload.productName ?? 'Product', available: Number(payload.availableStock ?? 0), reorderPoint: Number(payload.reorderPoint ?? 0), occurredAt: event.createdAt, dashboardUrl: `${process.env.BETTER_AUTH_URL || 'https://pesaby.com'}/dashboard/inventory` })
    await db.transaction(async (tx) => {
      const claimed = await tx.update(notificationEvent)
        .set({ payload: { ...payload, ...message }, materializedAt: new Date() })
        .where(and(eq(notificationEvent.id, event.id), isNull(notificationEvent.materializedAt)))
        .returning({ id: notificationEvent.id })
      if (!claimed.length || !recipients.length) return
      const inserted = await tx.insert(notificationDelivery).values(recipients.map((recipient) => ({
        id: generateId(), eventId: event.id, organizationId: event.organizationId,
        userId: recipient.userId, recipientEmail: recipient.email.trim().toLowerCase(), recipientName: recipient.name,
      }))).onConflictDoNothing().returning({ id: notificationDelivery.id })
      created += inserted.length
    })
  }
  return created
}
