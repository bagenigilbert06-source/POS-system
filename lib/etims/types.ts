export const ETIMS_STATUSES = [
  'NOT_REQUIRED',
  'PENDING',
  'SUBMITTING',
  'ACCEPTED',
  'FAILED',
  'RETRYING',
  'CANCELLED',
  'CREDITED',
] as const

export type EtimsStatus = (typeof ETIMS_STATUSES)[number]
export type EtimsEnvironment = 'sandbox' | 'production'
/** Internal connection lifecycle. Pending/active values are legal only when
 * returned by a certified provider status operation. */
export const ETIMS_CONNECTION_STATUSES = ['NOT_CONFIGURED', 'ONBOARDING_REQUIRED', 'AUTHORIZATION_PENDING', 'INITIALIZING', 'ACTIVE', 'ERROR', 'DISABLED'] as const
export type EtimsConnectionStatus = (typeof ETIMS_CONNECTION_STATUSES)[number]
export type EtimsConnectionStatusResult = {
  /** Already normalized by a certified adapter; never infer it from transport success. */
  status: Exclude<EtimsConnectionStatus, 'NOT_CONFIGURED' | 'ERROR' | 'DISABLED'>
  providerStatus?: string
  providerReference?: string
  message?: string
}
export type EtimsProviderCapabilities = {
  supportsIntegrationAuthorizationVerification: boolean
  supportsBranchDiscovery: boolean
  supportsDeviceInitialization: boolean
  supportsConnectionTest: boolean
  supportsSalesSubmission: boolean
  supportsCreditNotes: boolean
}

export type EtimsConfigurationSnapshot = {
  id: string
  organizationId: string
  branchId: string
  enabled: boolean
  environment: EtimsEnvironment
  integrationMethod: 'OSCU' | 'VSCU'
  providerName: string
  businessKraPin: string | null
  vatRegistered: boolean
  externalBranchId: string | null
  deviceId: string | null
  apiBaseUrl: string | null
  credentialReference: string | null
  clientId: string | null
  clientSecretReference: string | null
  certificateReference: string | null
  privateKeyReference: string | null
  tokenConfiguration: Record<string, unknown>
  invoiceSubmissionEnabled: boolean
  automaticRetryEnabled: boolean
  maximumRetryAttempts: number
  receiptDetailsEnabled: boolean
}

export type EtimsInvoiceLine = {
  lineNumber: number
  saleItemId?: string
  productId: string
  itemCode: string
  name: string
  unitCode: string
  quantity: number
  unitPrice: number
  grossAmount: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  totalAmount: number
  taxCategory: string
  taxRate: number
  vatClassification: string | null
  classificationCode?: string | null
  packagingUnitCode?: string | null
  packageQuantity?: number | null
  barcode?: string | null
}

export type EtimsInvoice = {
  idempotencyKey: string
  saleId: string
  receiptNumber: string
  issuedAt: string
  currency: 'KES'
  business: { kraPin: string; branchId: string; deviceId: string | null }
  customer: {
    name: string | null
    kraPin: string | null
    phone: string | null
    email: string | null
    customerType: string | null
    vatRegistered: boolean
  }
  paymentMethod: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  roundingAmount: number
  totalAmount: number
  lines: EtimsInvoiceLine[]
  /** Branch-scoped OSCU sequence, allocated durably before delivery. */
  providerInvoiceNumber?: number
}

export type EtimsCreditNoteRequest = {
  idempotencyKey: string
  returnId: string
  returnNumber: string
  originalSaleId: string
  originalProviderSubmissionId: string
  reason: string
  amount: number
  issuedAt: string
  lines: Array<{ productId: string; name: string; quantity: number; amount: number }>
  originalInvoice?: EtimsInvoice
  originalInvoiceNumber?: number
  providerInvoiceNumber?: number
  creditLines?: EtimsInvoiceLine[]
}

export type EtimsProviderResult = {
  accepted: boolean
  duplicate?: boolean
  retryable?: boolean
  submissionId?: string
  invoiceNumber?: string
  internalReference?: string
  controlNumber?: string
  receiptNumber?: string
  creditNoteNumber?: string
  qrData?: string
  verificationData?: string
  errorCode?: string
  errorMessage?: string
  raw: Record<string, unknown>
}

export interface EtimsProvider {
  readonly name: string
  authenticate(): Promise<void>
  validateConfiguration(): Promise<{ valid: boolean; message: string }>
  healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }>
  initializeDevice?(input: { taxpayerPin: string; branchId: string; deviceSerial: string }): Promise<{ ok: boolean; code?: string; message?: string; identifiers?: Record<string, string> }>
  /** Obtains an explicitly confirmed authorization/device lifecycle result.
   * Absent until the provider's certified status contract is implemented. */
  getConnectionStatus?(): Promise<EtimsConnectionStatusResult>
  /** Verifies OSCU integration authorization without persisting the token. */
  verifyIntegrationAuthorization?(input: { businessKraPin: string; integrationToken: string }): Promise<{ ok: boolean; code?: string; message?: string }>
  submitInvoice(invoice: EtimsInvoice): Promise<EtimsProviderResult>
  getInvoiceStatus(submissionId: string): Promise<EtimsProviderResult>
  submitCreditNote(note: EtimsCreditNoteRequest): Promise<EtimsProviderResult>
  cancelInvoice?(submissionId: string, reason: string): Promise<EtimsProviderResult>
}

export class EtimsValidationError extends Error {
  readonly code: string
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message)
    this.name = 'EtimsValidationError'
    this.code = code
  }
}

export class EtimsTemporaryError extends Error {
  readonly code: string
  constructor(message: string, code = 'PROVIDER_TEMPORARY_ERROR') {
    super(message)
    this.name = 'EtimsTemporaryError'
    this.code = code
  }
}
