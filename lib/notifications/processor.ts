import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notificationDelivery, notificationEvent } from '@/lib/db/schema'
import { EmailDeliveryError, sendEmail } from '@/lib/email/client'

const LEASE_MS = 5 * 60_000, MAX_ATTEMPTS = 8
const retryAt = (attempt: number, now: Date) => new Date(now.getTime() + Math.min(360, 2 ** Math.max(0, attempt - 1)) * 60_000)

export async function claimNotificationDelivery(now = new Date()) {
  return db.transaction(async (tx) => {
    const rows = await tx.execute(sql<{ id: string }>`select id from notification_delivery where (status in ('PENDING','RETRYABLE_FAILURE') and ("nextRetryAt" is null or "nextRetryAt" <= ${now})) or (status = 'PROCESSING' and "leaseUntil" < ${now}) order by "createdAt" for update skip locked limit 1`)
    const id = rows.rows[0]?.id
    if (!id) return null
    const [claimed] = await tx.update(notificationDelivery).set({ status: 'PROCESSING', attempts: sql`${notificationDelivery.attempts} + 1`, leaseUntil: new Date(now.getTime() + LEASE_MS), updatedAt: now }).where(eq(notificationDelivery.id, String(id))).returning()
    return claimed ?? null
  })
}

type Deliver = typeof sendEmail

export async function processDueNotifications(limit = 25, deliver: Deliver = sendEmail, clock: () => Date = () => new Date()) {
  const outcomes: string[] = []
  for (let i = 0; i < limit; i++) {
    const delivery = await claimNotificationDelivery(clock()); if (!delivery) break
    try {
      const [event] = await db.select().from(notificationEvent).where(eq(notificationEvent.id, delivery.eventId)).limit(1)
      if (!event) throw new EmailDeliveryError('Notification event is missing', false)
      const payload = event.payload as { subject?: string; html?: string; text?: string }
      if (!payload.subject || !payload.html || !payload.text) throw new EmailDeliveryError('Notification template is unavailable', false)
      const sent = await deliver({ to: { email: delivery.recipientEmail, name: delivery.recipientName ?? undefined }, subject: payload.subject, html: payload.html, text: payload.text })
      const completedAt = clock()
      await db.update(notificationDelivery).set({ status: 'SENT', providerMessageId: sent.providerMessageId ?? null, sentAt: completedAt, leaseUntil: null, updatedAt: completedAt }).where(eq(notificationDelivery.id, delivery.id)); outcomes.push('SENT')
    } catch (error) {
      const retryable = error instanceof EmailDeliveryError ? error.retryable : true
      const permanent = !retryable || delivery.attempts >= MAX_ATTEMPTS
      const completedAt = clock()
      await db.update(notificationDelivery).set({ status: permanent ? 'PERMANENT_FAILURE' : 'RETRYABLE_FAILURE', nextRetryAt: permanent ? null : retryAt(delivery.attempts, completedAt), leaseUntil: null, failedAt: permanent ? completedAt : null, lastError: (error instanceof Error ? error.message : 'Delivery failed').replace(/[\r\n]+/g, ' ').slice(0, 500), updatedAt: completedAt }).where(eq(notificationDelivery.id, delivery.id)); outcomes.push(permanent ? 'PERMANENT_FAILURE' : 'RETRYABLE_FAILURE')
    }
  }
  return outcomes
}
