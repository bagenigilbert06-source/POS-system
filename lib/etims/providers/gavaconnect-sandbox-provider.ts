import type { EtimsConfigurationSnapshot, EtimsCreditNoteRequest, EtimsInvoice, EtimsProvider, EtimsProviderResult } from '../types'
import { EtimsValidationError } from '../types'
import { initializeDevice as initializeGavaDevice, requestAccessToken } from './gavaconnect/client'

/** GavaConnect sandbox boundary. Network/auth behavior intentionally awaits official API documentation. */
export class GavaConnectSandboxProvider implements EtimsProvider {
  readonly name = 'gavaconnect-sandbox'
  constructor(private readonly configuration: EtimsConfigurationSnapshot) {}
  async authenticate(): Promise<void> { await requestAccessToken() }
  async validateConfiguration() { return { valid: false, message: 'GavaConnect sandbox adapter is awaiting its certified API specification.' } }
  async healthCheck() { return { ok: false, message: 'GavaConnect sandbox connection testing is not implemented.', latencyMs: 0 } }
  async initializeDevice(input: { taxpayerPin: string; branchId: string; deviceSerial: string }) {
    const body = await initializeGavaDevice({ tin: input.taxpayerPin, bhfId: input.branchId, deviceSerial: input.deviceSerial })
    if (!body || typeof body !== 'object') return { ok: false, code: 'MALFORMED_RESPONSE', message: 'GavaConnect returned an invalid initialization response.' }
    return { ok: false, code: 'RESPONSE_SCHEMA_UNCONFIRMED', message: 'Initialization response received; success cannot be determined until the documented response schema is confirmed.' }
  }
  async submitInvoice(_invoice: EtimsInvoice): Promise<EtimsProviderResult> { throw new EtimsValidationError('GavaConnect sandbox sales submission is not implemented.', 'GAVACONNECT_UNIMPLEMENTED') }
  async getInvoiceStatus(_submissionId: string): Promise<EtimsProviderResult> { throw new EtimsValidationError('GavaConnect sandbox status lookup is not implemented.', 'GAVACONNECT_UNIMPLEMENTED') }
  async submitCreditNote(_note: EtimsCreditNoteRequest): Promise<EtimsProviderResult> { throw new EtimsValidationError('GavaConnect sandbox credit notes are not implemented.', 'GAVACONNECT_UNIMPLEMENTED') }
}
