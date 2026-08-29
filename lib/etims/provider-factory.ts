import { MockEtimsProvider, type MockEtimsScenario } from './providers/mock-provider'
import { EtimsValidationError, type EtimsConfigurationSnapshot, type EtimsProvider, type EtimsProviderCapabilities } from './types'

export function getEtimsProviderCapabilities(configuration: Pick<EtimsConfigurationSnapshot, 'providerName'>): EtimsProviderCapabilities {
  const runtime = configuration.providerName === 'mock'
  return { supportsIntegrationAuthorizationVerification: false, supportsBranchDiscovery: false, supportsDeviceInitialization: false, supportsConnectionTest: runtime, supportsSalesSubmission: runtime, supportsCreditNotes: runtime }
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
  if (configuration.providerName === 'mock') {
    if (configuration.environment !== 'sandbox') {
      throw new EtimsValidationError('The mock eTIMS provider is restricted to sandbox mode', 'MOCK_PRODUCTION_BLOCKED')
    }
    const scenario = String(configuration.tokenConfiguration.mockScenario ?? 'success') as MockEtimsScenario
    return new MockEtimsProvider(configuration, scenario)
  }

  // A real provider adapter must be implemented from its certified, versioned
  // specification. Refusing here prevents fabricated KRA endpoints/payloads.
  throw new EtimsValidationError(
    `No certified adapter is installed for provider "${configuration.providerName}"`,
    'PROVIDER_ADAPTER_MISSING'
  )
}
