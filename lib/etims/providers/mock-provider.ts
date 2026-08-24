import {
  EtimsTemporaryError,
  EtimsValidationError,
  type EtimsConfigurationSnapshot,
  type EtimsCreditNoteRequest,
  type EtimsInvoice,
  type EtimsProvider,
  type EtimsProviderResult,
} from '../types'

export type MockEtimsScenario =
  | 'success'
  | 'rejected'
  | 'timeout'
  | 'temporary_failure'
  | 'invalid_configuration'

/** Development-only deterministic adapter. It can never run in production. */
export class MockEtimsProvider implements EtimsProvider {
  readonly name = 'mock'
  private readonly accepted = new Map<string, EtimsProviderResult>()

  constructor(
    private readonly configuration: EtimsConfigurationSnapshot,
    private readonly scenario: MockEtimsScenario = 'success'
  ) {}

  async authenticate() {
    if (this.configuration.environment !== 'sandbox') {
      throw new EtimsValidationError('The mock eTIMS provider is restricted to sandbox mode', 'MOCK_PRODUCTION_BLOCKED')
    }
    if (this.scenario === 'invalid_configuration') {
      throw new EtimsValidationError('Mock scenario: invalid configuration', 'INVALID_CONFIGURATION')
    }
  }

  async validateConfiguration() {
    if (this.configuration.environment !== 'sandbox') return { valid: false, message: 'Mock provider cannot be used in production' }
    if (!this.configuration.businessKraPin) return { valid: false, message: 'Business KRA PIN is required' }
    if (!this.configuration.externalBranchId) return { valid: false, message: 'eTIMS branch identifier is required' }
    return { valid: true, message: 'Development mock configuration is valid' }
  }

  async healthCheck() {
    const started = Date.now()
    const validation = await this.validateConfiguration()
    return { ok: validation.valid, message: validation.message, latencyMs: Date.now() - started }
  }

  async submitInvoice(invoice: EtimsInvoice) {
    await this.authenticate()
    const existing = this.accepted.get(invoice.idempotencyKey)
    if (existing) return { ...existing, duplicate: true }
    this.applyScenario()
    const suffix = invoice.saleId.slice(-10).toUpperCase()
    const result: EtimsProviderResult = {
      accepted: true,
      submissionId: `MOCK-SBX-SUB-${suffix}`,
      invoiceNumber: `MOCK-SBX-INV-${suffix}`,
      internalReference: invoice.receiptNumber,
      receiptNumber: `MOCK-SBX-RCT-${suffix}`,
      verificationData: `DEVELOPMENT-ONLY:${invoice.idempotencyKey}`,
      raw: { mock: true, environment: 'sandbox', scenario: this.scenario },
    }
    this.accepted.set(invoice.idempotencyKey, result)
    return result
  }

  async getInvoiceStatus(submissionId: string) {
    const result = [...this.accepted.values()].find((item) => item.submissionId === submissionId)
    return result ?? { accepted: false, retryable: false, errorCode: 'MOCK_NOT_FOUND', errorMessage: 'Mock submission not found', raw: { mock: true } }
  }

  async submitCreditNote(note: EtimsCreditNoteRequest) {
    await this.authenticate()
    const existing = this.accepted.get(note.idempotencyKey)
    if (existing) return { ...existing, duplicate: true }
    this.applyScenario()
    const suffix = note.returnId.slice(-10).toUpperCase()
    const result: EtimsProviderResult = {
      accepted: true,
      submissionId: `MOCK-SBX-CN-SUB-${suffix}`,
      creditNoteNumber: `MOCK-SBX-CN-${suffix}`,
      internalReference: note.returnNumber,
      raw: { mock: true, environment: 'sandbox', scenario: this.scenario },
    }
    this.accepted.set(note.idempotencyKey, result)
    return result
  }

  private applyScenario() {
    if (this.scenario === 'rejected') throw new EtimsValidationError('Mock scenario: invoice rejected', 'MOCK_REJECTED')
    if (this.scenario === 'timeout') throw new EtimsTemporaryError('Mock scenario: provider timeout', 'MOCK_TIMEOUT')
    if (this.scenario === 'temporary_failure') throw new EtimsTemporaryError('Mock scenario: provider unavailable', 'MOCK_UNAVAILABLE')
  }
}
