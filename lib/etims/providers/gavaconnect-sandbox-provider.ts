import type { EtimsConfigurationSnapshot, EtimsCreditNoteRequest, EtimsInvoice, EtimsProvider, EtimsProviderResult } from '../types'
import { EtimsValidationError } from '../types'
import { initializeDevice as initializeGavaDevice, requestAccessToken } from './gavaconnect/client'

/** GavaConnect sandbox boundary. Network/auth behavior intentionally awaits official API documentation. */
export class GavaConnectSandboxProvider implements EtimsProvider {
  readonly name = 'gavaconnect-sandbox'
  constructor(private readonly configuration: EtimsConfigurationSnapshot) {}
  async authenticate(): Promise<void> { await requestAccessToken() }
  async validateConfiguration() {
    if (!this.configuration.businessKraPin) return { valid: false, message: 'Business KRA PIN is required.' }
    return { valid: true, message: 'Sandbox credentials are configured. Device activation remains unconfirmed.' }
  }
  /** Tests only server-to-provider authentication. It never establishes
   * authorization, device activation, or fiscal transmission readiness. */
  async healthCheck() {
    const started = Date.now()
    await this.authenticate()
    return { ok: true, message: 'GavaConnect sandbox authentication succeeded. Device activation is not confirmed.', latencyMs: Date.now() - started }
  }
  async initializeDevice(input: { taxpayerPin: string; branchId: string; deviceSerial: string }) {
    const body = await initializeGavaDevice({ tin: input.taxpayerPin, bhfId: input.branchId, deviceSerial: input.deviceSerial })
    if (!body || typeof body !== 'object') return { ok: false, code: 'MALFORMED_RESPONSE', message: 'GavaConnect returned an invalid initialization response.' }
    return { ok: false, code: 'RESPONSE_SCHEMA_UNCONFIRMED', message: 'Initialization response received; success cannot be determined until the documented response schema is confirmed.' }
  }
  async submitInvoice(_invoice: EtimsInvoice): Promise<EtimsProviderResult> { throw new EtimsValidationError('GavaConnect sandbox sales submission is not implemented.', 'GAVACONNECT_UNIMPLEMENTED') }
  async getInvoiceStatus(_submissionId: string): Promise<EtimsProviderResult> { throw new EtimsValidationError('GavaConnect sandbox status lookup is not implemented.', 'GAVACONNECT_UNIMPLEMENTED') }
  async submitCreditNote(_note: EtimsCreditNoteRequest): Promise<EtimsProviderResult> { throw new EtimsValidationError('GavaConnect sandbox credit notes are not implemented.', 'GAVACONNECT_UNIMPLEMENTED') }
}
