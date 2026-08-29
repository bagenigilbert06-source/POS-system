'use server'

import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auditEvent, branch, customer, etimsConfiguration, etimsCreditNote, etimsSubmission, product, sale, salesReturn } from '@/lib/db/schema'
import { requireFullAuthentication, requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { generateId } from '@/lib/utils'
import { createEtimsProvider } from '@/lib/etims/provider-factory'
import { processEtimsCreditNote, processEtimsSubmission } from '@/lib/etims/service'
import type { EtimsConfigurationSnapshot } from '@/lib/etims/types'

const reference = z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,127}$/, 'Use a private server environment-variable name').optional().or(z.literal(''))
const configurationSchema = z.object({
  branchId: z.string().min(1),
  enabled: z.boolean(),
  environment: z.enum(['sandbox', 'production']),
  integrationMethod: z.enum(['OSCU', 'VSCU']),
  providerName: z.string().trim().min(2).max(80),
  businessKraPin: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5,20}$/).optional().or(z.literal('')),
  vatRegistered: z.boolean(),
  externalBranchId: z.string().trim().max(120).optional(),
  deviceId: z.string().trim().max(120).optional(),
  apiBaseUrl: z.string().trim().url().optional().or(z.literal('')),
  credentialReference: reference,
  clientId: z.string().trim().max(200).optional(),
  clientSecretReference: reference,
  certificateReference: reference,
  privateKeyReference: reference,
  invoiceSubmissionEnabled: z.boolean(),
  automaticRetryEnabled: z.boolean(),
  maximumRetryAttempts: z.number().int().min(1).max(20),
  receiptDetailsEnabled: z.boolean(),
})

export type EtimsConfigurationInput = z.input<typeof configurationSchema>

const merchantSetupSchema = z.object({ branchId: z.string().min(1), environment: z.enum(['sandbox', 'production']),
  integrationMethod: z.enum(['OSCU', 'VSCU']), businessKraPin: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5,20}$/),
  externalBranchId: z.string().trim().max(120).optional().or(z.literal('')), vatRegistered: z.boolean() })

const integrationAuthorizationSchema = z.object({ branchId: z.string().min(1), integrationToken: z.string().trim().min(1).max(4096) })

/** Verify an OSCU token server-side. The token is intentionally never stored, logged, or returned. */
export async function verifyEtimsIntegrationAuthorization(input: z.input<typeof integrationAuthorizationSchema>) {
  let data: z.infer<typeof integrationAuthorizationSchema>
  try { data = integrationAuthorizationSchema.parse(input) } catch { throw new Error('Enter a valid integration token.') }
  const authorization = await requireFullAuthentication()
  if (!authorization.permissions.includes(PermissionEnum.ETIMS_CONFIGURE)) throw new Error('eTIMS configuration permission denied')
  const [config] = await db.select().from(etimsConfiguration).where(and(eq(etimsConfiguration.organizationId, authorization.organizationId), eq(etimsConfiguration.branchId, data.branchId))).limit(1)
  if (!config) return { ok: false, code: 'NOT_CONFIGURED', message: 'Save the business identity before verifying integration authorization.' }
  try {
    const provider = createEtimsProvider(configSnapshot(config))
    if (!provider.verifyIntegrationAuthorization) return { ok: false, code: 'UNSUPPORTED', message: 'This provider does not expose OSCU token verification yet.' }
    const result = await provider.verifyIntegrationAuthorization({ businessKraPin: config.businessKraPin ?? '', integrationToken: data.integrationToken })
    // Provider-specific authorization is informational until certified runtime
    // onboarding/device initialization exists; it cannot activate this branch.
    return { ok: result.ok, code: result.code ?? (result.ok ? 'VERIFIED' : 'INVALID'), message: result.ok ? 'Integration authorization verified.' : 'Integration token could not be verified.' }
  } catch {
    return { ok: false, code: 'ERROR', message: 'Unable to verify integration authorization right now.' }
  }
}

/** Merchant-safe setup boundary. Technical retry policy and all credential
 * references remain server-owned and are never accepted from the browser. */
export async function activateEtimsBranch(input: z.input<typeof merchantSetupSchema>) {
  let data: z.infer<typeof merchantSetupSchema>
  try { data = merchantSetupSchema.parse(input) } catch { throw new Error('Enter a valid KRA PIN and setup details.') }
  const authorization = await requireFullAuthentication()
  if (!authorization.permissions.includes(PermissionEnum.ETIMS_CONFIGURE)) throw new Error('eTIMS configuration permission denied')
  const [existing] = await db.select().from(etimsConfiguration).where(and(eq(etimsConfiguration.organizationId, authorization.organizationId), eq(etimsConfiguration.branchId, data.branchId))).limit(1)
  // Saving identity is not activation: OSCU approval and device initialization happen externally first.
  return saveEtimsConfiguration({ ...data, enabled: false, providerName: data.environment === 'sandbox' ? 'mock' : (existing?.providerName || 'kra-provider'),
    deviceId: existing?.deviceId || `PESABY-${data.branchId}`, apiBaseUrl: existing?.apiBaseUrl || '', credentialReference: existing?.credentialReference || '',
    clientId: existing?.clientId || '', clientSecretReference: existing?.clientSecretReference || '', certificateReference: existing?.certificateReference || '',
    privateKeyReference: existing?.privateKeyReference || '', invoiceSubmissionEnabled: true, automaticRetryEnabled: true, maximumRetryAttempts: 5, receiptDetailsEnabled: true })
}

export async function saveEtimsConfiguration(input: EtimsConfigurationInput) {
  let data: z.infer<typeof configurationSchema>
  try { data = configurationSchema.parse(input) } catch { throw new Error('Invalid eTIMS configuration. Check the required fields.') }
  const authorization = await requireFullAuthentication()
  if (!authorization.permissions.includes(PermissionEnum.ETIMS_CONFIGURE)) throw new Error('eTIMS configuration permission denied')
  const [ownedBranch] = await db.select({ id: branch.id }).from(branch).where(and(eq(branch.id, data.branchId), eq(branch.organizationId, authorization.organizationId))).limit(1)
  if (!ownedBranch) throw new Error('Branch not found')
  if (data.environment === 'production' && data.providerName === 'mock') throw new Error('The development mock provider cannot be used in production')
  if (data.environment === 'production' && data.apiBaseUrl && !data.apiBaseUrl.startsWith('https://')) throw new Error('Production provider URLs must use HTTPS')
  for (const value of [data.credentialReference, data.clientSecretReference, data.certificateReference, data.privateKeyReference]) {
    if (value?.startsWith('NEXT_PUBLIC_')) throw new Error('eTIMS secrets cannot use public environment variables')
  }
  const id = generateId()
  await db.transaction(async (tx) => {
    await tx.insert(etimsConfiguration).values({
      id, organizationId: authorization.organizationId,
      ...data,
      connectionStatus: 'PORTAL_ONBOARDING_REQUIRED',
      businessKraPin: data.businessKraPin || null,
      externalBranchId: data.externalBranchId || null,
      deviceId: data.deviceId || null,
      apiBaseUrl: data.apiBaseUrl || null,
      credentialReference: data.credentialReference || null,
      clientId: data.clientId || null,
      clientSecretReference: data.clientSecretReference || null,
      certificateReference: data.certificateReference || null,
      privateKeyReference: data.privateKeyReference || null,
      tokenConfiguration: {},
    }).onConflictDoUpdate({ target: [etimsConfiguration.organizationId, etimsConfiguration.branchId], set: {
      ...data,
      connectionStatus: 'PORTAL_ONBOARDING_REQUIRED',
      lastConnectionMessage: null,
      businessKraPin: data.businessKraPin || null,
      externalBranchId: data.externalBranchId || null,
      deviceId: data.deviceId || null,
      apiBaseUrl: data.apiBaseUrl || null,
      credentialReference: data.credentialReference || null,
      clientId: data.clientId || null,
      clientSecretReference: data.clientSecretReference || null,
      certificateReference: data.certificateReference || null,
      privateKeyReference: data.privateKeyReference || null,
      tokenConfiguration: {},
      updatedAt: new Date(),
    } })
    await tx.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
      action: 'etims_configuration_changed', metadata: { branchId: data.branchId, enabled: data.enabled, environment: data.environment,
        integrationMethod: data.integrationMethod, providerName: data.providerName, credentialsUpdated: Boolean(data.credentialReference || data.clientSecretReference || data.certificateReference || data.privateKeyReference) } })
  })
  revalidatePath('/dashboard/etims')
  return { success: true }
}

function configSnapshot(row: typeof etimsConfiguration.$inferSelect): EtimsConfigurationSnapshot {
  return { ...row, environment: row.environment === 'production' ? 'production' : 'sandbox', integrationMethod: row.integrationMethod === 'VSCU' ? 'VSCU' : 'OSCU', tokenConfiguration: {} }
}

export async function testEtimsConnection(branchId: string) {
  const authorization = await requireFullAuthentication()
  if (!authorization.permissions.includes(PermissionEnum.ETIMS_CONFIGURE)) throw new Error('eTIMS configuration permission denied')
  const [config] = await db.select().from(etimsConfiguration).where(and(eq(etimsConfiguration.organizationId, authorization.organizationId), eq(etimsConfiguration.branchId, branchId))).limit(1)
  if (!config) return { ok: false, message: 'Save this branch configuration first', latencyMs: 0 }
  try {
    const provider = createEtimsProvider(configSnapshot(config))
    const result = await provider.healthCheck()
    const publicMessage = result.ok ? 'Connection verified successfully.' : 'Connection could not be verified. Review the secure server logs.'
    await db.update(etimsConfiguration).set({ connectionStatus: result.ok ? (config.environment === 'production' ? 'CONNECTED' : 'SANDBOX') : 'ERROR',
      lastConnectionTestAt: new Date(), lastConnectionSuccessAt: result.ok ? new Date() : config.lastConnectionSuccessAt,
      lastConnectionMessage: publicMessage, updatedAt: new Date() }).where(eq(etimsConfiguration.id, config.id))
    await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
      action: 'etims_connection_tested', metadata: { branchId, provider: config.providerName, environment: config.environment, ok: result.ok, latencyMs: result.latencyMs } })
    return { ok: result.ok, message: publicMessage, latencyMs: result.latencyMs }
  } catch (error) {
    const message = 'Connection test failed. Review the secure server logs.'
    await db.update(etimsConfiguration).set({ connectionStatus: 'ERROR', lastConnectionTestAt: new Date(),
      lastConnectionMessage: message.slice(0, 500), updatedAt: new Date() }).where(eq(etimsConfiguration.id, config.id))
    await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
      action: 'etims_connection_tested', metadata: { branchId, provider: config.providerName, environment: config.environment, ok: false, latencyMs: 0, errorType: error instanceof Error ? error.name : 'UnknownError' } })
    console.error('[etims] connection test failed', { branchId, provider: config.providerName, environment: config.environment, errorType: error instanceof Error ? error.name : 'UnknownError' })
    return { ok: false, message, latencyMs: 0 }
  }
}

export async function retryEtimsSubmission(submissionId: string) {
  const authorization = await requirePermission(PermissionEnum.ETIMS_RETRY)
  const [submission] = await db.select({ id: etimsSubmission.id }).from(etimsSubmission).where(and(eq(etimsSubmission.id, submissionId), eq(etimsSubmission.organizationId, authorization.organizationId), authorization.isOrganizationWide ? undefined : inArray(etimsSubmission.branchId, authorization.branchIds.length ? authorization.branchIds : ['']))).limit(1)
  if (!submission) throw new Error('eTIMS submission not found')
  const result = await processEtimsSubmission(submission.id, { userId: authorization.userId, manual: true })
  await db.insert(auditEvent).values({ id: generateId(), organizationId: authorization.organizationId, userId: authorization.userId,
    action: 'etims_manual_retry', metadata: { submissionId, result: result.status } })
  revalidatePath('/dashboard/etims')
  return { status: result.status, message: 'message' in result ? result.message : undefined }
}

export async function retryEtimsCreditNote(noteId: string) {
  const authorization = await requirePermission(PermissionEnum.ETIMS_RETRY)
  const [note] = await db.select({ id: etimsCreditNote.id }).from(etimsCreditNote).where(and(eq(etimsCreditNote.id, noteId), eq(etimsCreditNote.organizationId, authorization.organizationId), authorization.isOrganizationWide ? undefined : inArray(etimsCreditNote.branchId, authorization.branchIds.length ? authorization.branchIds : ['']))).limit(1)
  if (!note) throw new Error('eTIMS credit note not found')
  const result = await processEtimsCreditNote(note.id, authorization.userId, true)
  revalidatePath('/dashboard/etims')
  return result
}

export async function getEtimsDashboard(input?: { status?: string; branchId?: string; receipt?: string; customer?: string; from?: string; to?: string; page?: number; pageSize?: number; exceptionsOnly?: boolean }) {
  const authorization = await requirePermission(PermissionEnum.ETIMS_VIEW)
  const orgId = authorization.organizationId
  const scope = authorization.isOrganizationWide ? undefined : inArray(etimsSubmission.branchId, authorization.branchIds.length ? authorization.branchIds : [''])
  const conditions = [eq(etimsSubmission.organizationId, orgId), scope]
  if (input?.status && input.status !== 'all') conditions.push(eq(etimsSubmission.status, input.status))
  if (input?.branchId) conditions.push(eq(etimsSubmission.branchId, input.branchId))
  if (input?.receipt) conditions.push(ilike(sale.receiptNo, `%${input.receipt.trim().slice(0, 80)}%`))
  if (input?.customer) conditions.push(ilike(customer.name, `%${input.customer.trim().slice(0, 80)}%`))
  if (input?.exceptionsOnly) conditions.push(inArray(etimsSubmission.status, ['PENDING', 'SUBMITTING', 'RETRYING', 'FAILED']))
  if (input?.from) conditions.push(gte(etimsSubmission.createdAt, new Date(`${input.from}T00:00:00+03:00`)))
  if (input?.to) conditions.push(lte(etimsSubmission.createdAt, new Date(`${input.to}T23:59:59.999+03:00`)))
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [summary] = await db.select({
    submittedToday: sql<number>`count(*) filter (where ${etimsSubmission.createdAt} >= ${today})`,
    accepted: sql<number>`count(*) filter (where ${etimsSubmission.status} in ('ACCEPTED','CREDITED'))`,
    pending: sql<number>`count(*) filter (where ${etimsSubmission.status} in ('PENDING','SUBMITTING'))`,
    failed: sql<number>`count(*) filter (where ${etimsSubmission.status} = 'FAILED')`,
    retrying: sql<number>`count(*) filter (where ${etimsSubmission.status} = 'RETRYING')`,
    acceptedValue: sql<string>`coalesce(sum(${sale.total}) filter (where ${etimsSubmission.status} in ('ACCEPTED','CREDITED')),0)`,
    acceptedTax: sql<string>`coalesce(sum(${sale.taxAmount}) filter (where ${etimsSubmission.status} in ('ACCEPTED','CREDITED')),0)`,
  }).from(etimsSubmission).innerJoin(sale, eq(sale.id, etimsSubmission.saleId)).where(and(eq(etimsSubmission.organizationId, orgId), scope))
  const pageSize = Math.min(100, Math.max(10, input?.pageSize ?? 25))
  const page = Math.max(1, input?.page ?? 1)
  const [{ total: rowCount }] = await db.select({ total: sql<number>`count(*)` }).from(etimsSubmission)
    .innerJoin(sale, eq(sale.id, etimsSubmission.saleId)).leftJoin(customer, eq(customer.id, sale.customerId)).where(and(...conditions))
  const rows = await db.select({
    id: etimsSubmission.id, saleId: sale.id, receiptNo: sale.receiptNo, createdAt: sale.createdAt,
    customerName: customer.name, amount: sale.total, tax: sale.taxAmount, status: etimsSubmission.status,
    reference: etimsSubmission.invoiceNumber, attempts: etimsSubmission.retryCount, lastError: etimsSubmission.errorMessage,
    lastSubmissionAt: etimsSubmission.lastAttemptAt, branchId: etimsSubmission.branchId,
    provider: etimsSubmission.provider, environment: etimsSubmission.environment,
  }).from(etimsSubmission).innerJoin(sale, eq(sale.id, etimsSubmission.saleId)).leftJoin(customer, eq(customer.id, sale.customerId))
    .where(and(...conditions)).orderBy(desc(etimsSubmission.createdAt)).limit(pageSize).offset((page - 1) * pageSize)
  const creditSummary = await db.select({ count: sql<number>`count(*)`, amount: sql<string>`coalesce(sum(${salesReturn.amount}),0)` })
    .from(etimsCreditNote).innerJoin(salesReturn, eq(salesReturn.id, etimsCreditNote.returnId))
    .where(and(eq(etimsCreditNote.organizationId, orgId), inArray(etimsCreditNote.status, ['ACCEPTED']), authorization.isOrganizationWide ? undefined : inArray(etimsCreditNote.branchId, authorization.branchIds.length ? authorization.branchIds : [''])))
  const creditRows = await db.select({ id: etimsCreditNote.id, saleId: etimsCreditNote.saleId, returnNo: salesReturn.returnNo,
    receiptNo: salesReturn.receiptNo, amount: salesReturn.amount, status: etimsCreditNote.status, attempts: etimsCreditNote.retryCount,
    lastError: etimsCreditNote.errorMessage, reference: etimsCreditNote.creditNoteNumber, lastAttemptAt: etimsCreditNote.lastAttemptAt,
  }).from(etimsCreditNote).innerJoin(salesReturn, eq(salesReturn.id, etimsCreditNote.returnId))
    .where(and(eq(etimsCreditNote.organizationId, orgId), authorization.isOrganizationWide ? undefined : inArray(etimsCreditNote.branchId, authorization.branchIds.length ? authorization.branchIds : [''])))
    .orderBy(desc(etimsCreditNote.createdAt)).limit(100)
  const [readiness] = await db.select({ total: sql<number>`count(*)`, ready: sql<number>`count(*) filter (where ${product.etimsItemCode} is not null and ${product.etimsUnitCode} is not null and ${product.etimsTaxCategory} is not null and ${product.etimsTaxRate} is not null)` })
    .from(product).where(and(eq(product.orgId, orgId), eq(product.isActive, true)))
  return { summary: { ...summary, creditNotes: Number(creditSummary[0]?.count ?? 0), creditedAmount: Number(creditSummary[0]?.amount ?? 0) },
    readiness: { total: Number(readiness?.total ?? 0), ready: Number(readiness?.ready ?? 0) },
    pagination: { page, pageSize, total: Number(rowCount ?? 0), pages: Math.max(1, Math.ceil(Number(rowCount ?? 0) / pageSize)) }, rows, creditRows }
}
