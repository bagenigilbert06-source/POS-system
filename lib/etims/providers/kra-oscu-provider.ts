import {
  EtimsTemporaryError,
  EtimsValidationError,
  type EtimsConfigurationSnapshot,
  type EtimsCreditNoteRequest,
  type EtimsInvoice,
  type EtimsProvider,
  type EtimsProviderResult,
} from '../types'
import { DatabaseEtimsSecretStore, type EtimsSecretStore } from '../secret-store'

export const KRA_OSCU_PATHS = {
  initialize: 'selectInitOsdcInfo',
  itemClassifications: 'selectItemClsList',
  saveItem: 'saveItem',
  saveSales: 'saveTrnsSalesOsdc',
} as const

export type KraResultKind = 'SUCCESS' | 'NO_RESULT' | 'DEVICE_ERROR' | 'REQUEST_ERROR' | 'DUPLICATE' | 'COMMUNICATION_ERROR' | 'REGISTRATION_ERROR' | 'MODIFICATION_ERROR' | 'NON_RETRYABLE_PROVIDER_ERROR' | 'UNKNOWN_SERVER_FAILURE'

const RESULT_KINDS: Record<string, KraResultKind> = {
  '000': 'SUCCESS', '001': 'NO_RESULT',
  '891': 'REQUEST_ERROR', '892': 'REQUEST_ERROR', '893': 'REQUEST_ERROR',
  '894': 'COMMUNICATION_ERROR', '895': 'REQUEST_ERROR', '896': 'REQUEST_ERROR', '899': 'COMMUNICATION_ERROR',
  '900': 'REQUEST_ERROR', '901': 'DEVICE_ERROR', '902': 'DEVICE_ERROR', '903': 'DEVICE_ERROR',
  '910': 'REQUEST_ERROR', '911': 'REQUEST_ERROR', '912': 'REQUEST_ERROR',
  '921': 'NON_RETRYABLE_PROVIDER_ERROR', '922': 'NON_RETRYABLE_PROVIDER_ERROR', '990': 'NON_RETRYABLE_PROVIDER_ERROR',
  '991': 'REGISTRATION_ERROR', '992': 'MODIFICATION_ERROR', '993': 'NON_RETRYABLE_PROVIDER_ERROR',
  '994': 'DUPLICATE', '995': 'NON_RETRYABLE_PROVIDER_ERROR', '999': 'UNKNOWN_SERVER_FAILURE',
}

export function classifyKraResultCode(code: string): KraResultKind {
  return RESULT_KINDS[code] ?? 'UNKNOWN_SERVER_FAILURE'
}

export function mapKraPaymentMethod(method: string) {
  const normalized = method.trim().toLowerCase().replace(/[ _-]/g, '')
  if (normalized === 'cash') return '01'
  if (normalized === 'card' || normalized === 'creditcard' || normalized === 'debitcard') return '05'
  if (normalized === 'mpesa' || normalized === 'mobilemoney') return '06'
  throw new EtimsValidationError('The payment method is not mapped to an OSCU payment code.', 'KRA_PAYMENT_METHOD_UNMAPPED')
}

export type KraDeviceInitializationRequest = { tin: string; bhfId: string; dvcSrlNo: string }
export type KraItemClassificationRequest = { tin: string; bhfId: string; cmcKey: string; lastReqDt: string }
export type KraItemClassification = { itemClsCd: string; itemClsNm: string; itemClsLvl: number; taxTyCd: string | null; mjrTgYn: string | null; useYn: string }
export type KraItemSaveRequest = {
  tin: string; bhfId: string; cmcKey: string; itemClsCd: string; itemCd: string; itemTyCd: string; itemNm: string
  itemStdNm: string | null; orgnNatCd: string; pkgUnitCd: string; qtyUnitCd: string; taxTyCd: string; btchNo: string | null
  bcd: string | null; dftPrc: number; grpPrcL1: number | null; grpPrcL2: number | null; grpPrcL3: number | null
  grpPrcL4: number | null; grpPrcL5: number | null; addInfo: string | null; sftyQty: number | null; isrcAplcbYn: 'Y' | 'N'
  useYn: 'Y' | 'N'; regrId: string; regrNm: string; modrId: string; modrNm: string
}

type KraEnvelope<T = unknown> = { resultCd: string; resultMsg: string; resultDt: string; data?: T | null }
type KraSalesResponseData = { curRcptNo: number | string; totRcptNo: number | string; intrlData: string; rcptSign: string; sdcDateTime: string }

function requiredText(value: unknown, name: string, maximum: number) {
  if (typeof value !== 'string' || !value || value.length > maximum) throw new EtimsValidationError(`Invalid required OSCU field: ${name}.`, 'KRA_INVALID_REQUEST')
  return value
}

function kraDate(value: string, withTime = true) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) throw new EtimsValidationError('Invalid OSCU transaction date.', 'KRA_INVALID_DATE')
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  const day = `${part('year')}${part('month')}${part('day')}`
  return withTime ? `${day}${part('hour')}${part('minute')}${part('second')}` : day
}

function scrubMessage(_message: unknown) { return 'KRA OSCU rejected the request. Review the provider result code.' }

export function serializeDeviceInitialization(input: { taxpayerPin: string; branchId: string; deviceSerial: string }): KraDeviceInitializationRequest {
  return { tin: requiredText(input.taxpayerPin, 'tin', 11), bhfId: requiredText(input.branchId, 'bhfId', 2), dvcSrlNo: requiredText(input.deviceSerial, 'dvcSrlNo', 100) }
}

export function parseDeviceInitialization(value: unknown) {
  const response = parseEnvelope<Record<string, unknown>>(value)
  if (response.resultCd !== '000') return { ok: false as const, code: response.resultCd, kind: classifyKraResultCode(response.resultCd) }
  const info = response.data?.info
  if (!info || typeof info !== 'object') throw new EtimsValidationError('KRA OSCU returned a malformed initialization response.', 'KRA_MALFORMED_RESPONSE')
  const record = info as Record<string, unknown>
  return {
    ok: true as const,
    publicInfo: { tin: requiredText(record.tin, 'tin', 11), taxprNm: requiredText(record.taxprNm, 'taxprNm', 60), bhfId: requiredText(record.bhfId, 'bhfId', 2), bhfNm: requiredText(record.bhfNm, 'bhfNm', 60), dvcId: requiredText(record.dvcId, 'dvcId', 20), sdcId: requiredText(record.sdcId, 'sdcId', 18), mrcNo: requiredText(record.mrcNo, 'mrcNo', 11) },
    // This value may only cross into a server-side secret store. Callers must
    // never serialize the returned object to a browser, audit event or log.
    secret: { cmcKey: requiredText(record.cmcKey, 'cmcKey', 255) },
  }
}

function parseEnvelope<T>(value: unknown): KraEnvelope<T> {
  if (!value || typeof value !== 'object') throw new EtimsValidationError('KRA OSCU returned a malformed response.', 'KRA_MALFORMED_RESPONSE')
  const item = value as Record<string, unknown>
  if (typeof item.resultCd !== 'string' || typeof item.resultMsg !== 'string' || typeof item.resultDt !== 'string') throw new EtimsValidationError('KRA OSCU returned a malformed response.', 'KRA_MALFORMED_RESPONSE')
  return item as KraEnvelope<T>
}

function taxRateFor(code: string, invoice: EtimsInvoice) {
  return invoice.lines.find((line) => line.taxCategory === code)?.taxRate ?? 0
}

export function serializeKraSale(invoice: EtimsInvoice, cmcKey: string, credit?: { originalInvoiceNumber: number; reasonCode: string; issuedAt: string }) {
  if (!Number.isInteger(invoice.providerInvoiceNumber) || Number(invoice.providerInvoiceNumber) <= 0) throw new EtimsValidationError('A positive OSCU invoice sequence number is required.', 'KRA_INVOICE_NUMBER_REQUIRED')
  const sum = (field: 'taxableAmount' | 'taxAmount', category: string) => Number(invoice.lines.filter((line) => line.taxCategory === category).reduce((total, line) => total + line[field], 0).toFixed(2))
  const timestamp = kraDate(invoice.issuedAt)
  const request = {
    tin: requiredText(invoice.business.kraPin, 'tin', 11), bhfId: requiredText(invoice.business.branchId, 'bhfId', 2), cmcKey: requiredText(cmcKey, 'cmcKey', 255),
    trdInvcNo: requiredText(invoice.receiptNumber, 'trdInvcNo', 50), invcNo: invoice.providerInvoiceNumber,
    orgInvcNo: credit?.originalInvoiceNumber ?? 0, custTin: invoice.customer.kraPin, custNm: invoice.customer.name,
    salesTyCd: 'N', rcptTyCd: credit ? 'R' : 'S', pmtTyCd: mapKraPaymentMethod(invoice.paymentMethod), salesSttsCd: credit ? '05' : '02',
    cfmDt: timestamp, salesDt: kraDate(invoice.issuedAt, false), stockRlsDt: timestamp, cnclReqDt: null, cnclDt: null,
    rfdDt: credit ? kraDate(credit.issuedAt) : null, rfdRsnCd: credit?.reasonCode ?? null, totItemCnt: invoice.lines.length,
    taxblAmtA: sum('taxableAmount', 'A'), taxblAmtB: sum('taxableAmount', 'B'), taxblAmtC: sum('taxableAmount', 'C'), taxblAmtD: sum('taxableAmount', 'D'), taxblAmtE: sum('taxableAmount', 'E'),
    taxRtA: taxRateFor('A', invoice), taxRtB: taxRateFor('B', invoice), taxRtC: taxRateFor('C', invoice), taxRtD: taxRateFor('D', invoice), taxRtE: taxRateFor('E', invoice),
    taxAmtA: sum('taxAmount', 'A'), taxAmtB: sum('taxAmount', 'B'), taxAmtC: sum('taxAmount', 'C'), taxAmtD: sum('taxAmount', 'D'), taxAmtE: sum('taxAmount', 'E'),
    totTaxblAmt: Number(invoice.lines.reduce((n, line) => n + line.taxableAmount, 0).toFixed(2)), totTaxAmt: Number(invoice.taxAmount.toFixed(2)), totAmt: Number(invoice.totalAmount.toFixed(2)),
    prchrAcptcYn: 'N', remark: null, regrId: 'SYSTEM', regrNm: 'Pesaby POS', modrId: 'SYSTEM', modrNm: 'Pesaby POS',
    receipt: { custTin: invoice.customer.kraPin, custMblNo: invoice.customer.phone, rcptPbctDt: timestamp, trdeNm: null, adrs: null, topMsg: null, btmMsg: null, prchrAcptcYn: 'N' },
    itemList: invoice.lines.map((line) => ({ itemSeq: line.lineNumber, itemClsCd: line.classificationCode ?? null, itemCd: requiredText(line.itemCode, 'itemCd', 20), itemNm: requiredText(line.name, 'itemNm', 200), bcd: line.barcode ?? null,
      pkgUnitCd: requiredText(line.packagingUnitCode, 'pkgUnitCd', 5), pkg: line.packageQuantity ?? line.quantity, qtyUnitCd: requiredText(line.unitCode, 'qtyUnitCd', 5), qty: line.quantity,
      prc: line.unitPrice, splyAmt: line.grossAmount, dcRt: line.grossAmount ? Number(((line.discountAmount / line.grossAmount) * 100).toFixed(2)) : 0, dcAmt: line.discountAmount,
      isrccCd: null, isrccNm: null, isrcRt: null, isrcAmt: null, taxTyCd: requiredText(line.taxCategory, 'taxTyCd', 5), taxblAmt: line.taxableAmount, taxAmt: line.taxAmount, totAmt: line.totalAmount })),
  }
  return request
}

export function normalizeKraSalesResponse(value: unknown): EtimsProviderResult {
  const response = parseEnvelope<KraSalesResponseData>(value)
  const kind = classifyKraResultCode(response.resultCd)
  if (kind !== 'SUCCESS') return { accepted: false, duplicate: kind === 'DUPLICATE', retryable: kind === 'COMMUNICATION_ERROR' || kind === 'UNKNOWN_SERVER_FAILURE', errorCode: response.resultCd, errorMessage: scrubMessage(response.resultMsg), raw: { resultCd: response.resultCd, resultDt: response.resultDt } }
  const data = response.data
  if (!data || data.curRcptNo === undefined || data.totRcptNo === undefined || typeof data.intrlData !== 'string' || typeof data.rcptSign !== 'string' || typeof data.sdcDateTime !== 'string') throw new EtimsValidationError('KRA OSCU returned a malformed fiscal receipt.', 'KRA_MALFORMED_RESPONSE')
  return { accepted: true, submissionId: String(data.curRcptNo), invoiceNumber: String(data.curRcptNo), receiptNumber: String(data.curRcptNo), internalReference: data.intrlData, controlNumber: String(data.totRcptNo), verificationData: data.rcptSign, raw: { resultCd: response.resultCd, resultDt: response.resultDt, data } }
}

export function mapCreditReason(reason: string) {
  const value = reason.toLowerCase()
  if (value.includes('damag')) return '03'
  if (value.includes('wast')) return '04'
  if (value.includes('missing quantity')) return '01'
  if (value.includes('missing data')) return '02'
  if (value.includes('raw material')) return '05'
  return '06'
}

export class KraOscuProvider implements EtimsProvider {
  readonly name = 'KRA_OSCU'
  private readonly baseUrl: string | null
  private readonly secretScope
  constructor(private readonly configuration: EtimsConfigurationSnapshot, private readonly fetcher: typeof fetch = fetch, private readonly secrets: EtimsSecretStore = new DatabaseEtimsSecretStore()) {
    this.secretScope = { organizationId: configuration.organizationId, branchId: configuration.branchId, provider: 'KRA_OSCU', environment: configuration.environment }
    this.baseUrl = configuration.apiBaseUrl ?? (configuration.environment === 'sandbox' ? process.env.KRA_OSCU_SANDBOX_BASE_URL : process.env.KRA_OSCU_PRODUCTION_BASE_URL) ?? null
  }
  async authenticate() { const result = await this.validateConfiguration(); if (!result.valid) throw new EtimsValidationError(result.message, 'KRA_OSCU_NOT_CONFIGURED') }
  async validateConfiguration() { const hasSecret = await this.secrets.hasBranchSecret(this.secretScope, 'cmcKey'); return { valid: Boolean(this.configuration.businessKraPin && this.configuration.externalBranchId && this.configuration.deviceId && this.baseUrl && hasSecret), message: 'Direct KRA OSCU requires a PIN, two-character branch ID, device serial, configurable base URL and securely persisted communication key.' } }
  async healthCheck() { const ok = Boolean(this.baseUrl && await this.secrets.hasBranchSecret(this.secretScope, 'cmcKey')); return { ok, message: ok ? 'OSCU initialization state is available.' : 'OSCU initialization is required.', latencyMs: 0 } }
  async getConnectionStatus() { const active = Boolean(this.baseUrl && await this.secrets.hasBranchSecret(this.secretScope, 'cmcKey')); return active ? { status: 'ACTIVE' as const, providerStatus: 'INITIALIZED', message: 'OSCU initialization state is available.' } : { status: 'INITIALIZING' as const, providerStatus: 'INITIALIZATION_REQUIRED', message: 'OSCU initialization is required.' } }
  private async post<T>(path: string, body: unknown): Promise<T> {
    if (!this.baseUrl) throw new EtimsValidationError('KRA OSCU base URL is not configured.', 'KRA_BASE_URL_REQUIRED')
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000)
    try {
      const response = await this.fetcher(new URL(path, this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal })
      if (!response.ok) throw new EtimsTemporaryError('KRA OSCU communication failed.', `KRA_HTTP_${response.status}`)
      return await response.json() as T
    } catch (error) { if (error instanceof EtimsValidationError || error instanceof EtimsTemporaryError) throw error; throw new EtimsTemporaryError('KRA OSCU communication failed.', 'KRA_COMMUNICATION_FAILURE') } finally { clearTimeout(timer) }
  }
  async initializeDevice(input: { taxpayerPin: string; branchId: string; deviceSerial: string }) { const parsed = parseDeviceInitialization(await this.post(KRA_OSCU_PATHS.initialize, serializeDeviceInitialization(input))); if (!parsed.ok) return { ok: false, code: parsed.code, message: 'KRA OSCU device initialization was rejected.' }; await this.secrets.setBranchSecret(this.secretScope, 'cmcKey', parsed.secret.cmcKey); return { ok: true, identifiers: parsed.publicInfo } }
  async syncItemClassifications(lastReqDt: string): Promise<KraItemClassification[]> { const response = parseEnvelope<{ itemClsList?: KraItemClassification[] }>(await this.post(KRA_OSCU_PATHS.itemClassifications, { tin: this.configuration.businessKraPin, bhfId: this.configuration.externalBranchId, cmcKey: await this.requireKey(), lastReqDt: requiredText(lastReqDt, 'lastReqDt', 14) })); if (response.resultCd === '001') return []; if (response.resultCd !== '000' || !Array.isArray(response.data?.itemClsList)) throw new EtimsValidationError('KRA OSCU classification synchronization failed.', response.resultCd); return response.data.itemClsList }
  async registerItem(item: Omit<KraItemSaveRequest, 'tin' | 'bhfId' | 'cmcKey'>) { return parseEnvelope(await this.post(KRA_OSCU_PATHS.saveItem, { tin: this.configuration.businessKraPin, bhfId: this.configuration.externalBranchId, cmcKey: await this.requireKey(), ...item })) }
  async submitInvoice(invoice: EtimsInvoice) { return normalizeKraSalesResponse(await this.post(KRA_OSCU_PATHS.saveSales, serializeKraSale(invoice, await this.requireKey()))) }
  async getInvoiceStatus(_submissionId: string): Promise<EtimsProviderResult> { throw new EtimsValidationError('The OSCU specification does not define a sales status endpoint.', 'KRA_STATUS_UNSUPPORTED') }
  async submitCreditNote(note: EtimsCreditNoteRequest): Promise<EtimsProviderResult> {
    if (!note.originalInvoice) throw new EtimsValidationError('The authoritative original OSCU invoice is required for a credit note.', 'KRA_ORIGINAL_INVOICE_REQUIRED')
    if (!Number.isInteger(note.originalInvoiceNumber)) throw new EtimsValidationError('The original OSCU invoice number is required for a credit note.', 'KRA_ORIGINAL_INVOICE_NUMBER_REQUIRED')
    const lines = note.creditLines ?? note.originalInvoice.lines
    const invoice: EtimsInvoice = { ...note.originalInvoice, providerInvoiceNumber: note.providerInvoiceNumber, receiptNumber: note.returnNumber, issuedAt: note.issuedAt,
      subtotal: Number(lines.reduce((sum, line) => sum + line.grossAmount, 0).toFixed(2)), discountAmount: Number(lines.reduce((sum, line) => sum + line.discountAmount, 0).toFixed(2)),
      taxAmount: Number(lines.reduce((sum, line) => sum + line.taxAmount, 0).toFixed(2)), roundingAmount: 0, totalAmount: note.amount, lines }
    return normalizeKraSalesResponse(await this.post(KRA_OSCU_PATHS.saveSales, serializeKraSale(invoice, await this.requireKey(), { originalInvoiceNumber: note.originalInvoiceNumber!, reasonCode: mapCreditReason(note.reason), issuedAt: note.issuedAt })))
  }
  private async requireKey() { const key = await this.secrets.getBranchSecret(this.secretScope, 'cmcKey'); if (!key) throw new EtimsValidationError('OSCU initialization is required.', 'KRA_CMC_KEY_REQUIRED'); return key }
}
