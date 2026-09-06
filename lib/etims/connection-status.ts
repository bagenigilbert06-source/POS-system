import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditEvent, etimsConfiguration } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { createEtimsProvider } from './provider-factory'
import { EtimsTemporaryError, EtimsValidationError, type EtimsConfigurationSnapshot } from './types'

export const CONNECTION_STATUS_FRESH_FOR_MS = 2 * 60 * 1000

type RefreshInput = { organizationId: string; branchId: string; userId?: string; force?: boolean; now?: Date }
export type ConnectionRefreshResult =
  | { ok: true; refreshed: false; code: 'FRESH'; connectionStatus: string }
  | { ok: false; refreshed: false; code: 'PROVIDER_OPERATION_UNAVAILABLE'; connectionStatus: string; message: string }
  | { ok: false; refreshed: true; code: 'PROVIDER_ERROR'; connectionStatus: 'ERROR'; message: string }
  | { ok: true; refreshed: true; code: 'UPDATED'; connectionStatus: string }

function snapshot(row: typeof etimsConfiguration.$inferSelect): EtimsConfigurationSnapshot {
  return { ...row, environment: row.environment === 'production' ? 'production' : 'sandbox', integrationMethod: row.integrationMethod === 'VSCU' ? 'VSCU' : 'OSCU', tokenConfiguration: {} }
}

function safeError(error: unknown) {
  const known = error instanceof EtimsValidationError || error instanceof EtimsTemporaryError
  return {
    code: known ? error.code : 'PROVIDER_STATUS_CHECK_FAILED',
    message: (error instanceof Error ? error.message : 'Provider status check failed').replace(/[\r\n]+/g, ' ').slice(0, 500),
  }
}

/** Server-only status refresh boundary. It intentionally cannot infer ACTIVE,
 * PENDING, or INITIALIZING from authentication or a transport-level success. */
export async function refreshFiscalConnectionStatus(input: RefreshInput): Promise<ConnectionRefreshResult> {
  const now = input.now ?? new Date()
  const [configuration] = await db.select().from(etimsConfiguration).where(and(
    eq(etimsConfiguration.organizationId, input.organizationId),
    eq(etimsConfiguration.branchId, input.branchId),
  )).limit(1)
  if (!configuration) return { ok: false, refreshed: false, code: 'PROVIDER_OPERATION_UNAVAILABLE', connectionStatus: 'NOT_CONFIGURED', message: 'Fiscal connection is not configured for this branch.' }
  if (!input.force && configuration.lastStatusCheckAt && now.getTime() - configuration.lastStatusCheckAt.getTime() < CONNECTION_STATUS_FRESH_FOR_MS) {
    return { ok: true, refreshed: false, code: 'FRESH', connectionStatus: configuration.connectionStatus }
  }

  try {
    const provider = createEtimsProvider(snapshot(configuration))
    if (!provider.getConnectionStatus) {
      await db.update(etimsConfiguration).set({ lastStatusCheckAt: now, updatedAt: now }).where(eq(etimsConfiguration.id, configuration.id))
      return { ok: false, refreshed: false, code: 'PROVIDER_OPERATION_UNAVAILABLE', connectionStatus: configuration.connectionStatus, message: 'This provider has no certified authorization/device status operation installed.' }
    }
    const result = await provider.getConnectionStatus()
    const previous = configuration.connectionStatus
    const next = result.status === 'ACTIVE' ? 'ACTIVE' : result.status
    await db.update(etimsConfiguration).set({
      connectionStatus: next,
      providerStatus: result.providerStatus?.slice(0, 160) ?? null,
      providerReference: result.providerReference?.slice(0, 200) ?? null,
      lastConnectionMessage: result.message?.replace(/[\r\n]+/g, ' ').slice(0, 500) ?? null,
      lastStatusCheckAt: now,
      lastSuccessfulStatusCheckAt: now,
      activatedAt: next === 'ACTIVE' ? configuration.activatedAt ?? now : configuration.activatedAt,
      lastProviderErrorCode: null,
      lastProviderErrorMessage: null,
      updatedAt: now,
    }).where(and(eq(etimsConfiguration.id, configuration.id), eq(etimsConfiguration.organizationId, input.organizationId), eq(etimsConfiguration.branchId, input.branchId)))
    if (previous !== next && input.userId) await db.insert(auditEvent).values({ id: generateId(), organizationId: input.organizationId, userId: input.userId, action: 'etims_connection_status_changed', metadata: { branchId: input.branchId, provider: configuration.providerName, from: previous, to: next, providerReference: result.providerReference?.slice(0, 200) } })
    return { ok: true, refreshed: true, code: 'UPDATED', connectionStatus: next }
  } catch (error) {
    const failure = safeError(error)
    await db.update(etimsConfiguration).set({ connectionStatus: 'ERROR', lastStatusCheckAt: now, lastProviderErrorCode: failure.code, lastProviderErrorMessage: failure.message, lastConnectionMessage: 'Unable to check fiscal connection status.', updatedAt: now }).where(and(eq(etimsConfiguration.id, configuration.id), eq(etimsConfiguration.organizationId, input.organizationId), eq(etimsConfiguration.branchId, input.branchId)))
    if (configuration.connectionStatus !== 'ERROR' && input.userId) await db.insert(auditEvent).values({ id: generateId(), organizationId: input.organizationId, userId: input.userId, action: 'etims_connection_status_changed', metadata: { branchId: input.branchId, provider: configuration.providerName, from: configuration.connectionStatus, to: 'ERROR', errorCode: failure.code } })
    return { ok: false, refreshed: true, code: 'PROVIDER_ERROR', connectionStatus: 'ERROR', message: 'Unable to check fiscal connection status.' }
  }
}
