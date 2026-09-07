import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditEvent, etimsConfiguration } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { createEtimsProvider } from './provider-factory'
import type { EtimsConfigurationSnapshot, EtimsProvider } from './types'

function snapshot(row: typeof etimsConfiguration.$inferSelect): EtimsConfigurationSnapshot {
  return { ...row, environment: row.environment === 'production' ? 'production' : 'sandbox', integrationMethod: row.integrationMethod === 'VSCU' ? 'VSCU' : 'OSCU', tokenConfiguration: {} }
}

/** Server-only initialization transaction boundary. No caller supplies PIN,
 * branch or device values; those are loaded from authoritative configuration. */
export async function initializeKraOscuConfiguration(input: { configurationId: string; organizationId: string; branchId: string; actorId: string }, injectedProvider?: EtimsProvider) {
  const [row] = await db.select().from(etimsConfiguration).where(and(eq(etimsConfiguration.id, input.configurationId), eq(etimsConfiguration.organizationId, input.organizationId), eq(etimsConfiguration.branchId, input.branchId))).limit(1)
  if (!row || row.providerName !== 'KRA_OSCU' || row.environment !== 'sandbox') throw new Error('Sandbox KRA OSCU configuration is unavailable')
  if (!row.businessKraPin || !row.externalBranchId || !row.deviceId || !row.apiBaseUrl) throw new Error('Complete KRA PIN, branch, device and confirmed sandbox URL before initialization')
  await db.update(etimsConfiguration).set({ connectionStatus: 'INITIALIZING', providerStatus: 'INITIALIZING', lastConnectionMessage: 'Secure OSCU initialization is in progress.', lastProviderErrorCode: null, lastProviderErrorMessage: null, updatedAt: new Date() }).where(eq(etimsConfiguration.id, row.id))
  try {
    const provider = injectedProvider ?? createEtimsProvider(snapshot(row))
    if (!provider.initializeDevice) throw new Error('OSCU device initialization is unavailable')
    const result = await provider.initializeDevice({ taxpayerPin: row.businessKraPin, branchId: row.externalBranchId, deviceSerial: row.deviceId })
    if (!result.ok) throw new Error(`OSCU initialization rejected (${result.code ?? 'UNKNOWN'})`)
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.update(etimsConfiguration).set({ connectionStatus: 'ACTIVE', providerStatus: 'INITIALIZED', providerReference: result.identifiers?.dvcId ?? null,
        activatedAt: now, lastConnectionSuccessAt: now, lastSuccessfulStatusCheckAt: now, lastConnectionMessage: 'OSCU device initialized securely.', updatedAt: now }).where(and(eq(etimsConfiguration.id, row.id), eq(etimsConfiguration.connectionStatus, 'INITIALIZING')))
      await tx.insert(auditEvent).values({ id: generateId(), organizationId: input.organizationId, userId: input.actorId, action: 'etims_oscu_initialized', metadata: { branchId: input.branchId, provider: 'KRA_OSCU', environment: 'sandbox', deviceId: result.identifiers?.dvcId ?? null } })
    })
    return { ok: true as const, status: 'ACTIVE' as const }
  } catch (error) {
    const code = error instanceof Error && /\(([^)]+)\)$/.exec(error.message)?.[1] || 'INITIALIZATION_FAILED'
    await db.update(etimsConfiguration).set({ connectionStatus: 'ERROR', providerStatus: 'INITIALIZATION_ERROR', lastProviderErrorCode: code, lastProviderErrorMessage: 'OSCU initialization did not complete.', lastConnectionMessage: 'OSCU initialization failed. Review the safe provider code.', updatedAt: new Date() }).where(eq(etimsConfiguration.id, row.id))
    await db.insert(auditEvent).values({ id: generateId(), organizationId: input.organizationId, userId: input.actorId, action: 'etims_oscu_initialization_failed', metadata: { branchId: input.branchId, provider: 'KRA_OSCU', errorCode: code } })
    return { ok: false as const, status: 'ERROR' as const, code }
  }
}
