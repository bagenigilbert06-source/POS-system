import { and, eq, isNull } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { branch, businessSettings, customerFeedback, feedbackInvitation, organization, sale } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { FEEDBACK_TAGS, feedbackCategory } from './rules'

export { FEEDBACK_TAGS, feedbackCategory } from './rules'

/** Creates at most one invitation for a completed sale; no browser-provided tenant data. */
export async function createFeedbackInvitationForSale(saleId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(feedbackInvitation).where(eq(feedbackInvitation.saleId, saleId)).limit(1)
    if (existing) return existing
    const [record] = await tx.select({ id: sale.id, organizationId: sale.orgId, branchId: sale.branchId, status: sale.status }).from(sale).where(eq(sale.id, saleId)).limit(1)
    if (!record?.branchId || record.status !== 'completed') return null
    const [[settings], [org], [location]] = await Promise.all([
      tx.select({ enabled: businessSettings.feedbackQrEnabled, displayName: businessSettings.displayName }).from(businessSettings).where(eq(businessSettings.organizationId, record.organizationId)).limit(1),
      tx.select({ name: organization.name }).from(organization).where(eq(organization.id, record.organizationId)).limit(1),
      tx.select({ name: branch.name, organizationId: branch.organizationId }).from(branch).where(and(eq(branch.id, record.branchId), eq(branch.organizationId, record.organizationId))).limit(1),
    ])
    if (!settings?.enabled || !location || location.organizationId !== record.organizationId) return null
    const invitation = {
      id: generateId(), organizationId: record.organizationId, branchId: record.branchId, saleId: record.id,
      token: randomBytes(32).toString('base64url'),
      businessNameSnapshot: settings.displayName?.trim() || org?.name || 'Business',
      branchNameSnapshot: location.name, status: 'OPEN' as const,
    }
    await tx.insert(feedbackInvitation).values(invitation)
    return invitation
  })
}

export async function resolveFeedbackInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{32,}$/.test(token)) return null
  const [invitation] = await db.select().from(feedbackInvitation).where(eq(feedbackInvitation.token, token)).limit(1)
  if (!invitation || invitation.status === 'CANCELLED' || invitation.expiresAt && invitation.expiresAt < new Date()) return null
  const [record] = await db.select({ id: sale.id, status: sale.status, organizationId: sale.orgId, branchId: sale.branchId }).from(sale).where(and(eq(sale.id, invitation.saleId), eq(sale.orgId, invitation.organizationId), eq(sale.branchId, invitation.branchId))).limit(1)
  if (!record || record.status !== 'completed') return null
  const [settings] = await db.select({ logoUrl: businessSettings.receiptLogoUrl }).from(businessSettings).where(eq(businessSettings.organizationId, invitation.organizationId)).limit(1)
  return { ...invitation, logoUrl: settings?.logoUrl ?? null }
}

export async function submitFeedback(token: string, input: { score: number; tags?: string[]; comment?: string }) {
  if (!Number.isInteger(input.score) || input.score < 0 || input.score > 10) throw new Error('Choose a rating from 0 to 10.')
  const tags = (input.tags ?? []).filter((tag) => FEEDBACK_TAGS.includes(tag as typeof FEEDBACK_TAGS[number])).slice(0, 8)
  const comment = input.comment?.trim().slice(0, 1000) || null
  return db.transaction(async (tx) => {
    const [invitation] = await tx.select().from(feedbackInvitation).where(and(eq(feedbackInvitation.token, token), eq(feedbackInvitation.status, 'OPEN'), isNull(feedbackInvitation.respondedAt))).limit(1).for('update')
    if (!invitation) return { alreadySubmitted: true }
    const [record] = await tx.select({ id: sale.id }).from(sale).where(and(eq(sale.id, invitation.saleId), eq(sale.orgId, invitation.organizationId), eq(sale.branchId, invitation.branchId), eq(sale.status, 'completed'))).limit(1)
    if (!record) throw new Error('Feedback link unavailable.')
    await tx.insert(customerFeedback).values({ id: generateId(), invitationId: invitation.id, organizationId: invitation.organizationId, branchId: invitation.branchId, saleId: invitation.saleId, score: input.score, category: feedbackCategory(input.score), tags, comment })
    await tx.update(feedbackInvitation).set({ status: 'RESPONDED', respondedAt: new Date() }).where(eq(feedbackInvitation.id, invitation.id))
    return { alreadySubmitted: false }
  })
}
