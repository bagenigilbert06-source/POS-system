import { MockEtimsProvider, type MockEtimsScenario } from './providers/mock-provider'
import { GavaConnectSandboxProvider } from './providers/gavaconnect-sandbox-provider'
import { KraOscuProvider } from './providers/kra-oscu-provider'
import { EtimsValidationError, type EtimsConfigurationSnapshot, type EtimsProvider, type EtimsProviderCapabilities } from './types'

export function getEtimsProviderCapabilities(configuration: Pick<EtimsConfigurationSnapshot, 'providerName'>): EtimsProviderCapabilities {
  const mock = configuration.providerName === 'mock'
  const gavaSandbox = configuration.providerName === 'gavaconnect-sandbox'
  if (configuration.providerName === 'KRA_OSCU') return { supportsIntegrationAuthorizationVerification: false, supportsBranchDiscovery: false, supportsDeviceInitialization: true, supportsConnectionTest: true, supportsSalesSubmission: true, supportsCreditNotes: true }
  return { supportsIntegrationAuthorizationVerification: false, supportsBranchDiscovery: false, supportsDeviceInitialization: false, supportsConnectionTest: mock || gavaSandbox, supportsSalesSubmission: mock, supportsCreditNotes: mock }
}

/** Server-only adapter configuration check. Callers stay provider-neutral; each
 * adapter owns the environment variables or secret references it requires. */
export function isEtimsProviderConfigured(providerName: string) {
  if (providerName === 'KRA_OSCU') return Boolean((process.env.KRA_OSCU_SANDBOX_BASE_URL || process.env.KRA_OSCU_PRODUCTION_BASE_URL) && process.env.ETIMS_SECRET_ENCRYPTION_KEY)
  if (providerName === 'gavaconnect-sandbox') {
    return Boolean(process.env.GAVACONNECT_CONSUMER_KEY && process.env.GAVACONNECT_CONSUMER_SECRET)
  }
  return false
}

const SECRET_REFERENCE = /^[A-Z][A-Z0-9_]{2,127}$/

export function resolveServerSecret(reference: string | null) {
  if (!reference) return null
  if (!SECRET_REFERENCE.test(reference) || reference.startsWith('NEXT_PUBLIC_')) {
    throw new EtimsValidationError('Secret references must name a private server environment variable', 'INVALID_SECRET_REFERENCE')
  }
  return process.env[reference] ?? null
}

export function createEtimsProvider(configuration: EtimsConfigurationSnapshot): EtimsProvider {
  if (configuration.providerName === 'KRA_OSCU') {
    if (configuration.environment !== 'sandbox') throw new EtimsValidationError('Direct KRA OSCU remains sandbox-only until KRA acceptance is complete.', 'KRA_OSCU_PRODUCTION_BLOCKED')
    return new KraOscuProvider(configuration)
  }
  if (configuration.providerName === 'mock') {
    if (configuration.environment !== 'sandbox') {
      throw new EtimsValidationError('The mock eTIMS provider is restricted to sandbox mode', 'MOCK_PRODUCTION_BLOCKED')
    }
    const scenario = String(configuration.tokenConfiguration.mockScenario ?? 'success') as MockEtimsScenario
    return new MockEtimsProvider(configuration, scenario)
  }
  if (configuration.providerName === 'gavaconnect-sandbox') {
    if (configuration.environment !== 'sandbox') throw new EtimsValidationError('GavaConnect sandbox cannot be used in production', 'GAVACONNECT_SANDBOX_PRODUCTION_BLOCKED')
    if (!isEtimsProviderConfigured(configuration.providerName)) throw new EtimsValidationError('GavaConnect sandbox credentials are not configured', 'GAVACONNECT_NOT_CONFIGURED')
    return new GavaConnectSandboxProvider(configuration)
  }

  // A real provider adapter must be implemented from its certified, versioned
  // specification. Refusing here prevents fabricated KRA endpoints/payloads.
  throw new EtimsValidationError(
    `No certified adapter is installed for provider "${configuration.providerName}"`,
    'PROVIDER_ADAPTER_MISSING'
  )
}
