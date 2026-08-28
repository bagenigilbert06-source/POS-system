'use server'

import { requireAnyPermission, requirePermission } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { auditEvent, cardPaymentAttempt, cardTerminal, posSession } from '@/lib/db/schema'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'
import { and, desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const safeOptional = z.string().trim().max(120).optional().transform((value) => value || undefined)
const attemptSchema = z.object({
  terminalId: z.string().min(1).max(120),
  amount: z.number().positive().max(999999999),
  authorizationCode: z.string().trim().min(2).max(40),
  reference: safeOptional,
  cardBrand: z.enum(['visa', 'mastercard', 'amex', 'other']).optional(),
  last4: z.string().trim().regex(/^\d{4}$/).optional().or(z.literal('')).transform((value) => value || undefined),
  entryMode: z.enum(['chip', 'contactless', 'swipe', 'manual']).optional(),
  approvedConfirmation: z.literal(true),
  idempotencyKey: z.string().min(8).max(100),
})

export type ActiveCardTerminal = { id: string; name: string; terminalCode: string; provider: string | null; referenceRequired: boolean }

export async function listActiveCardTerminals(): Promise<ActiveCardTerminal[]> {
  const posAuthorization = await getPosAuthorizationContext()
  const authorization = posAuthorization ?? await requireAnyPermission([PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL])
  const { userId, organizationId } = authorization
  const [shift] = await db.select({ branchId: posSession.branchId }).from(posSession).where(and(
    eq(posSession.orgId, organizationId), eq(posSession.openedBy, userId), eq(posSession.status, 'open'),
    posAuthorization?.terminalId ? eq(posSession.terminalId, posAuthorization.terminalId) : undefined,
  )).limit(1)
  const branchId = posAuthorization?.branchId ?? shift?.branchId
  if (!branchId) return []
  return db.select({ id: cardTerminal.id, name: cardTerminal.name, terminalCode: cardTerminal.terminalCode, provider: cardTerminal.provider, referenceRequired: cardTerminal.referenceRequired })
    .from(cardTerminal).where(and(eq(cardTerminal.organizationId, organizationId), eq(cardTerminal.branchId, branchId), eq(cardTerminal.isActive, true))).orderBy(cardTerminal.name)
}

export async function prepareCardPaymentAttempt(input: z.input<typeof attemptSchema>) {
  const data = attemptSchema.parse(input)
  const posAuthorization = await getPosAuthorizationContext()
  const authorization = posAuthorization ?? await requirePermission(PermissionEnum.POS_SELL)
  const { userId, organizationId } = authorization
  const existing = await db.select().from(cardPaymentAttempt).where(and(eq(cardPaymentAttempt.organizationId, organizationId), eq(cardPaymentAttempt.idempotencyKey, data.idempotencyKey))).limit(1)
  if (existing[0]) return { id: existing[0].id, status: existing[0].status }
  const [shift] = await db.select().from(posSession).where(and(eq(posSession.orgId, organizationId), eq(posSession.openedBy, userId), eq(posSession.status, 'open'), posAuthorization?.terminalId ? eq(posSession.terminalId, posAuthorization.terminalId) : undefined)).limit(1)
  if (!shift) throw new Error('Start your shift before recording a card approval')
  if (!shift.branchId) throw new Error('The active shift has no assigned branch')
  const shiftBranchId = shift.branchId
  const [terminal] = await db.select().from(cardTerminal).where(and(eq(cardTerminal.id, data.terminalId), eq(cardTerminal.organizationId, organizationId), eq(cardTerminal.branchId, shiftBranchId), eq(cardTerminal.isActive, true))).limit(1)
  if (!terminal) throw new Error('This card terminal is not active for the current branch')
  if (terminal.referenceRequired && !data.reference) throw new Error('Reference / RRN is required for this terminal')
  const id = generateId()
  await db.transaction(async (tx) => {
    await tx.insert(cardPaymentAttempt).values({ id, organizationId, branchId: shiftBranchId, posSessionId: shift.id, cashierId: userId, cardTerminalId: terminal.id, amount: String(data.amount), authorizationCode: data.authorizationCode.toUpperCase(), reference: data.reference?.toUpperCase() ?? null, cardBrand: data.cardBrand ?? null, last4: data.last4 ?? null, entryMode: data.entryMode ?? null, status: 'approved_pending_sale', idempotencyKey: data.idempotencyKey })
    await tx.insert(auditEvent).values({ id: generateId(), organizationId, userId, action: 'card_payment_approved_on_terminal', metadata: { cardPaymentAttemptId: id, cardTerminalId: terminal.id, amount: data.amount, cardBrand: data.cardBrand ?? null, last4: data.last4 ?? null, entryMode: data.entryMode ?? null } })
  })
  return { id, status: 'approved_pending_sale' as const }
}

export async function markCardAttemptForReconciliation(attemptId: string) {
  const authorization = await getPosAuthorizationContext() ?? await requirePermission(PermissionEnum.POS_SELL)
  const [attempt] = await db.update(cardPaymentAttempt).set({ status: 'reconciliation_required', updatedAt: new Date() }).where(and(eq(cardPaymentAttempt.id, attemptId), eq(cardPaymentAttempt.organizationId, authorization.organizationId), eq(cardPaymentAttempt.cashierId, authorization.userId), eq(cardPaymentAttempt.status, 'approved_pending_sale'))).returning()
  if (!attempt) throw new Error('Card payment attempt is not available')
  await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId, action: 'card_payment_reconciliation_requested', metadata: { cardPaymentAttemptId: attempt.id, amount: attempt.amount, cardTerminalId: attempt.cardTerminalId } })
  revalidatePath('/dashboard/operations')
  return { success: true }
}

export async function listCardPaymentReconciliation() {
  const authorization = await requireAnyPermission([PermissionEnum.SETTINGS_VIEW, PermissionEnum.ADMIN_ACCESS])
  return db.select().from(cardPaymentAttempt).where(and(eq(cardPaymentAttempt.organizationId, authorization.organizationId), eq(cardPaymentAttempt.status, 'reconciliation_required'))).orderBy(desc(cardPaymentAttempt.createdAt))
}

export async function createCardTerminal(input: { branchId: string; name: string; terminalCode: string; provider?: string; referenceRequired?: boolean }) {
  const authorization = await requirePermission(PermissionEnum.SETTINGS_EDIT)
  const parsed = z.object({ branchId: z.string().min(1), name: z.string().trim().min(2).max(80), terminalCode: z.string().trim().min(2).max(40), provider: safeOptional, referenceRequired: z.boolean().optional() }).parse(input)
  if (!authorization.isOrganizationWide && !authorization.branchIds.includes(parsed.branchId)) throw new Error('Branch access denied')
  const id = generateId()
  await db.insert(cardTerminal).values({ id, organizationId: authorization.organizationId, branchId: parsed.branchId, name: parsed.name, terminalCode: parsed.terminalCode.toUpperCase(), provider: parsed.provider, referenceRequired: parsed.referenceRequired ?? false })
  revalidatePath('/dashboard/settings')
  return { id }
}
