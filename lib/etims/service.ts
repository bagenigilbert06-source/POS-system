import { and, asc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  auditEvent,
  etimsConfiguration,
  etimsCreditNote,
  etimsSubmission,
  etimsSubmissionAttempt,
  sale,
  salesReturn,
  salesReturnItem,
} from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { buildEtimsInvoice } from './invoice-builder'
import { createEtimsProvider } from './provider-factory'
import {
  EtimsTemporaryError,
  EtimsValidationError,
  type EtimsConfigurationSnapshot,
  type EtimsCreditNoteRequest,
  type EtimsProviderResult,
} from './types'

function snapshot(row: typeof etimsConfiguration.$inferSelect): EtimsConfigurationSnapshot {
  return {
    ...row,
    environment: row.environment === 'production' ? 'production' : 'sandbox',
    integrationMethod: row.integrationMethod === 'VSCU' ? 'VSCU' : 'OSCU',
    tokenConfiguration: row.tokenConfiguration && typeof row.tokenConfiguration === 'object'
      ? row.tokenConfiguration as Record<string, unknown>
      : {},
  }
}

function safeError(error: unknown) {
  const known = error instanceof EtimsValidationError || error instanceof EtimsTemporaryError
  return {
    code: known ? error.code : 'PROVIDER_ERROR',
    message: (error instanceof Error ? error.message : 'The eTIMS provider request failed').replace(/[\r\n]+/g, ' ').slice(0, 500),
    retryable: error instanceof EtimsTemporaryError,
  }
}

function nextRetry(attempt: number) {
  const delayMinutes = Math.min(60, 2 ** Math.max(0, attempt - 1))
  return new Date(Date.now() + delayMinutes * 60_000)
}

function log(event: string, data: Record<string, unknown>) {
  console.info(JSON.stringify({ scope: 'etims', event, at: new Date().toISOString(), ...data }))
}

async function audit(input: { organizationId: string; userId: string; action: string; metadata: Record<string, unknown> }) {
  await db.insert(auditEvent).values({ id: generateId(), ...input })
}

/**
 * Creates the durable fiscal outbox row without contacting the provider.
 *
 * This is deliberately the checkout-safe operation: a completed sale must not
 * keep a cashier waiting on provider authentication or a network round trip.
 */
export async function queueEtimsInvoice(saleId: string) {
  const [record] = await db.select({
    id: sale.id,
    orgId: sale.orgId,
    branchId: sale.branchId,
    userId: sale.userId,
  }).from(sale).where(eq(sale.id, saleId)).limit(1)
  if (!record?.branchId) return { status: 'NOT_REQUIRED' as const, message: 'Sale has no branch eTIMS configuration' }

  const [config] = await db.select().from(etimsConfiguration).where(and(
    eq(etimsConfiguration.organizationId, record.orgId),
    eq(etimsConfiguration.branchId, record.branchId)
  )).limit(1)
  if (!config?.enabled || !config.invoiceSubmissionEnabled) {
    return { status: 'NOT_REQUIRED' as const, message: 'eTIMS submission is disabled for this branch' }
  }

  const idempotencyKey = `etims:invoice:${record.orgId}:${record.id}`
  await db.insert(etimsSubmission).values({
    id: generateId(),
    organizationId: record.orgId,
    branchId: record.branchId,
    saleId: record.id,
    configurationId: config.id,
    status: 'PENDING',
    provider: config.providerName,
    environment: config.environment,
    idempotencyKey,
  }).onConflictDoNothing({ target: etimsSubmission.saleId })

  const [submission] = await db.select().from(etimsSubmission).where(eq(etimsSubmission.saleId, record.id)).limit(1)
  if (!submission) throw new Error('Could not create the eTIMS outbox record')
  return {
    status: submission.status === 'ACCEPTED' ? 'ACCEPTED' as const : 'PENDING' as const,
    submission,
    receiptDetailsEnabled: config.receiptDetailsEnabled,
  }
}

/** Creates the durable outbox row and immediately attempts delivery.
 * Use this only from a worker or an explicit administrative retry, never from
 * the cashier checkout critical path. */
export async function enqueueEtimsInvoice(saleId: string) {
  const queued = await queueEtimsInvoice(saleId)
  if (queued.status === 'ACCEPTED' || !queued.submission) return queued
  return {
    ...(await processEtimsSubmission(queued.submission.id, { manual: false })),
    receiptDetailsEnabled: queued.receiptDetailsEnabled,
  }
}

export async function processEtimsSubmission(submissionId: string, options: { userId?: string; manual: boolean }) {
  const started = Date.now()
  const [current] = await db.select().from(etimsSubmission).where(eq(etimsSubmission.id, submissionId)).limit(1)
  if (!current) throw new Error('eTIMS submission not found')
  if (current.status === 'ACCEPTED') return { status: 'ACCEPTED' as const, submission: current }

  const allowed = options.manual ? ['PENDING', 'FAILED', 'RETRYING'] : ['PENDING', 'RETRYING']
  // A stale SUBMITTING row is a recoverable lease. Compare the timestamp read
  // above so two workers cannot both renew and deliver the same fiscal request.
  const claimState = current.status === 'SUBMITTING' && !options.manual
    ? and(eq(etimsSubmission.status, 'SUBMITTING'), current.lastAttemptAt
      ? eq(etimsSubmission.lastAttemptAt, current.lastAttemptAt)
      : isNull(etimsSubmission.lastAttemptAt))
    : inArray(etimsSubmission.status, allowed)
  const [claimed] = await db.update(etimsSubmission).set({
    status: 'SUBMITTING',
    lastAttemptAt: new Date(),
    submittedAt: current.submittedAt ?? new Date(),
    updatedAt: new Date(),
  }).where(and(eq(etimsSubmission.id, current.id), claimState)).returning()
  if (!claimed) {
    const [latest] = await db.select().from(etimsSubmission).where(eq(etimsSubmission.id, current.id)).limit(1)
    return { status: latest?.status ?? current.status, submission: latest ?? current }
  }

  const [configRow] = await db.select().from(etimsConfiguration).where(and(
    eq(etimsConfiguration.id, claimed.configurationId),
    eq(etimsConfiguration.organizationId, claimed.organizationId),
    eq(etimsConfiguration.branchId, claimed.branchId)
  )).limit(1)
  const actorId = options.userId ?? (await db.select({ userId: sale.userId }).from(sale).where(eq(sale.id, claimed.saleId)).limit(1))[0]?.userId
  try {
    if (!configRow?.enabled || !configRow.invoiceSubmissionEnabled) throw new EtimsValidationError('eTIMS is disabled for this branch', 'CONFIGURATION_DISABLED')
    const configuration = snapshot(configRow)
    const invoice = await buildEtimsInvoice(claimed.saleId, configuration)
    const provider = createEtimsProvider(configuration)
    const validation = await provider.validateConfiguration()
    if (!validation.valid) throw new EtimsValidationError(validation.message, 'INVALID_CONFIGURATION')
    await provider.authenticate()
    await db.update(etimsSubmission).set({ requestData: invoice, updatedAt: new Date() }).where(eq(etimsSubmission.id, claimed.id))
    const result = await provider.submitInvoice(invoice)
    if (!result.accepted) {
      if (result.retryable) throw new EtimsTemporaryError(result.errorMessage ?? 'Provider temporarily rejected the invoice', result.errorCode)
      throw new EtimsValidationError(result.errorMessage ?? 'Provider rejected the invoice', result.errorCode ?? 'PROVIDER_REJECTED')
    }
    const acceptedAt = new Date()
    const [accepted] = await db.update(etimsSubmission).set({
      status: 'ACCEPTED',
      providerSubmissionId: result.submissionId ?? null,
      invoiceNumber: result.invoiceNumber ?? null,
      internalReference: result.internalReference ?? null,
      controlNumber: result.controlNumber ?? null,
      receiptNumber: result.receiptNumber ?? null,
      qrData: result.qrData ?? null,
      verificationData: result.verificationData ?? null,
      responseData: result.raw,
      acceptedAt,
      nextRetryAt: null,
      errorCode: null,
      errorMessage: null,
      updatedAt: acceptedAt,
    }).where(and(eq(etimsSubmission.id, claimed.id), eq(etimsSubmission.status, 'SUBMITTING'))).returning()
    await db.insert(etimsSubmissionAttempt).values({ id: generateId(), submissionId: claimed.id,
      organizationId: claimed.organizationId, attemptNumber: claimed.retryCount + 1,
      trigger: options.manual ? 'MANUAL' : claimed.retryCount ? 'AUTOMATIC' : 'INITIAL', status: 'ACCEPTED',
      resultCode: result.errorCode ?? null, resultMessage: result.errorMessage?.slice(0, 500) ?? null,
      startedAt: claimed.lastAttemptAt ?? new Date(started) }).onConflictDoNothing()
    if (actorId) await audit({ organizationId: claimed.organizationId, userId: actorId, action: 'etims_invoice_accepted', metadata: { saleId: claimed.saleId, submissionId: claimed.id, provider: claimed.provider, environment: claimed.environment, duplicate: Boolean(result.duplicate) } })
    log('invoice_accepted', { saleId: claimed.saleId, submissionId: claimed.id, provider: claimed.provider, latencyMs: Date.now() - started })
    return { status: 'ACCEPTED' as const, submission: accepted }
  } catch (error) {
    const failure = safeError(error)
    const attempts = claimed.retryCount + 1
    const mayRetry = failure.retryable && Boolean(configRow?.automaticRetryEnabled) && attempts < (configRow?.maximumRetryAttempts ?? 1)
    const status = mayRetry ? 'RETRYING' : 'FAILED'
    const [failed] = await db.update(etimsSubmission).set({
      status,
      retryCount: attempts,
      nextRetryAt: mayRetry ? nextRetry(attempts) : null,
      errorCode: failure.code,
      errorMessage: failure.message,
      responseData: { error: failure.code, retryable: failure.retryable },
      updatedAt: new Date(),
    }).where(eq(etimsSubmission.id, claimed.id)).returning()
    await db.insert(etimsSubmissionAttempt).values({ id: generateId(), submissionId: claimed.id,
      organizationId: claimed.organizationId, attemptNumber: attempts,
      trigger: options.manual ? 'MANUAL' : claimed.retryCount ? 'AUTOMATIC' : 'INITIAL', status,
      resultCode: failure.code, resultMessage: failure.message, startedAt: claimed.lastAttemptAt ?? new Date(started) }).onConflictDoNothing()
    if (actorId) await audit({ organizationId: claimed.organizationId, userId: actorId, action: mayRetry ? 'etims_invoice_retry_scheduled' : 'etims_invoice_failed', metadata: { saleId: claimed.saleId, submissionId: claimed.id, errorCode: failure.code, attempts } })
    log('invoice_failed', { saleId: claimed.saleId, submissionId: claimed.id, errorCode: failure.code, retryable: mayRetry, latencyMs: Date.now() - started })
    return { status, submission: failed, message: mayRetry ? 'Sale completed. eTIMS submission is pending and will retry automatically.' : 'Sale completed. eTIMS requires administrative review.' }
  }
}

export async function processDueEtimsRetries(limit = 25) {
  const stale = new Date(Date.now() - 5 * 60_000)
  const due = await db.select({ id: etimsSubmission.id }).from(etimsSubmission).where(or(
    eq(etimsSubmission.status, 'PENDING'),
    and(eq(etimsSubmission.status, 'RETRYING'), or(isNull(etimsSubmission.nextRetryAt), lte(etimsSubmission.nextRetryAt, new Date()))),
    and(eq(etimsSubmission.status, 'SUBMITTING'), lte(etimsSubmission.lastAttemptAt, stale))
  )).orderBy(asc(etimsSubmission.nextRetryAt)).limit(Math.min(100, Math.max(1, limit)))
  const results = []
  for (const item of due) results.push(await processEtimsSubmission(item.id, { manual: false }))
  return results
}

export async function enqueueEtimsCreditNote(returnId: string, actorId: string) {
  const [record] = await db.select().from(salesReturn).where(eq(salesReturn.id, returnId)).limit(1)
  if (!record) throw new Error('Return not found')
  const [original] = await db.select().from(etimsSubmission).where(and(eq(etimsSubmission.saleId, record.saleId), inArray(etimsSubmission.status, ['ACCEPTED', 'CREDITED']))).limit(1)
  if (!original) return { status: 'NOT_REQUIRED' as const }
  const [config] = await db.select().from(etimsConfiguration).where(eq(etimsConfiguration.id, original.configurationId)).limit(1)
  if (!config) throw new Error('Original eTIMS configuration is unavailable')
  const idempotencyKey = `etims:credit:${record.orgId}:${record.id}`
  await db.insert(etimsCreditNote).values({
    id: generateId(), organizationId: record.orgId, branchId: original.branchId, saleId: record.saleId,
    returnId: record.id, originalSubmissionId: original.id, provider: original.provider,
    environment: original.environment, idempotencyKey, status: 'PENDING',
  }).onConflictDoNothing({ target: etimsCreditNote.returnId })
  const [note] = await db.select().from(etimsCreditNote).where(eq(etimsCreditNote.returnId, record.id)).limit(1)
  if (!note || note.status === 'ACCEPTED') return { status: note?.status ?? 'ACCEPTED' }
  return processEtimsCreditNote(note.id, actorId, true)
}

export async function processEtimsCreditNote(noteId: string, actorId?: string, manual = false) {
  const [note] = await db.select().from(etimsCreditNote).where(eq(etimsCreditNote.id, noteId)).limit(1)
  if (!note) throw new Error('eTIMS credit note not found')
  if (note.status === 'ACCEPTED') return { status: 'ACCEPTED' as const }
  const [record] = await db.select().from(salesReturn).where(and(eq(salesReturn.id, note.returnId), eq(salesReturn.orgId, note.organizationId))).limit(1)
  const [original] = await db.select().from(etimsSubmission).where(and(eq(etimsSubmission.id, note.originalSubmissionId), eq(etimsSubmission.organizationId, note.organizationId))).limit(1)
  const [config] = original ? await db.select().from(etimsConfiguration).where(eq(etimsConfiguration.id, original.configurationId)).limit(1) : []
  if (!record || !original || !config) throw new Error('Credit note fiscal context is incomplete')
  const effectiveActorId = actorId ?? (await db.select({ userId: sale.userId }).from(sale).where(eq(sale.id, note.saleId)).limit(1))[0]?.userId
  if (!effectiveActorId) throw new Error('Credit note audit actor is unavailable')
  const [claimed] = await db.update(etimsCreditNote).set({ status: 'SUBMITTING', lastAttemptAt: new Date(), updatedAt: new Date() })
    .where(and(eq(etimsCreditNote.id, note.id), inArray(etimsCreditNote.status, manual ? ['PENDING', 'FAILED', 'RETRYING'] : ['PENDING', 'RETRYING', 'SUBMITTING']))).returning()
  if (!claimed) return { status: note.status }
  try {
    if (!original.providerSubmissionId) throw new EtimsValidationError('Original provider submission reference is missing', 'ORIGINAL_REFERENCE_MISSING')
    const lines = await db.select().from(salesReturnItem).where(eq(salesReturnItem.returnId, record.id))
    const request: EtimsCreditNoteRequest = {
      idempotencyKey: note.idempotencyKey, returnId: record.id, returnNumber: record.returnNo, originalSaleId: record.saleId,
      originalProviderSubmissionId: original.providerSubmissionId, reason: record.reason, amount: Number(record.amount),
      issuedAt: record.createdAt.toISOString(),
      lines: lines.map((line) => ({ productId: line.productId, name: line.productName, quantity: line.quantity, amount: Number(line.total) })),
    }
    const provider = createEtimsProvider(snapshot(config))
    const result: EtimsProviderResult = await provider.submitCreditNote(request)
    if (!result.accepted) throw result.retryable
      ? new EtimsTemporaryError(result.errorMessage ?? 'Credit note provider unavailable', result.errorCode)
      : new EtimsValidationError(result.errorMessage ?? 'Credit note rejected', result.errorCode)
    await db.transaction(async (tx) => {
      await tx.update(etimsCreditNote).set({ status: 'ACCEPTED', requestData: request, responseData: result.raw,
        providerSubmissionId: result.submissionId ?? null, creditNoteNumber: result.creditNoteNumber ?? null,
        acceptedAt: new Date(), errorCode: null, errorMessage: null, updatedAt: new Date() }).where(eq(etimsCreditNote.id, claimed.id))
      await tx.update(etimsSubmission).set({ status: 'CREDITED', updatedAt: new Date() }).where(eq(etimsSubmission.id, original.id))
      await tx.insert(auditEvent).values({ id: generateId(), organizationId: record.orgId, userId: effectiveActorId,
        action: 'etims_credit_note_accepted', metadata: { saleId: record.saleId, returnId: record.id, creditNoteId: claimed.id } })
    })
    return { status: 'ACCEPTED' as const }
  } catch (error) {
    const failure = safeError(error)
    const attempts = claimed.retryCount + 1
    const mayRetry = failure.retryable && config.automaticRetryEnabled && attempts < config.maximumRetryAttempts
    await db.update(etimsCreditNote).set({ status: mayRetry ? 'RETRYING' : 'FAILED', retryCount: attempts,
      nextRetryAt: mayRetry ? nextRetry(attempts) : null, errorCode: failure.code, errorMessage: failure.message,
      responseData: { error: failure.code, retryable: failure.retryable }, updatedAt: new Date() }).where(eq(etimsCreditNote.id, claimed.id))
    await audit({ organizationId: record.orgId, userId: effectiveActorId, action: mayRetry ? 'etims_credit_note_retry_scheduled' : 'etims_credit_note_failed', metadata: { saleId: record.saleId, returnId: record.id, errorCode: failure.code, attempts } })
    return { status: mayRetry ? 'RETRYING' as const : 'FAILED' as const, message: failure.message }
  }
}

export async function processDueEtimsCreditNoteRetries(limit = 25) {
  const stale = new Date(Date.now() - 5 * 60_000)
  const due = await db.select({ id: etimsCreditNote.id }).from(etimsCreditNote).where(or(
    and(eq(etimsCreditNote.status, 'RETRYING'), or(isNull(etimsCreditNote.nextRetryAt), lte(etimsCreditNote.nextRetryAt, new Date()))),
    and(eq(etimsCreditNote.status, 'SUBMITTING'), lte(etimsCreditNote.lastAttemptAt, stale))
  )).orderBy(asc(etimsCreditNote.nextRetryAt)).limit(Math.min(100, Math.max(1, limit)))
  const results = []
  for (const item of due) results.push(await processEtimsCreditNote(item.id, undefined, false))
  return results
}

export async function getEtimsReceiptData(saleId: string) {
  const [result] = await db.select({
    status: etimsSubmission.status,
    environment: etimsSubmission.environment,
    invoiceNumber: etimsSubmission.invoiceNumber,
    controlNumber: etimsSubmission.controlNumber,
    receiptNumber: etimsSubmission.receiptNumber,
    internalReference: etimsSubmission.internalReference,
    qrData: etimsSubmission.qrData,
    verificationData: etimsSubmission.verificationData,
  }).from(etimsSubmission).where(eq(etimsSubmission.saleId, saleId)).limit(1)
  return result ?? null
}
