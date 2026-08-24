import assert from 'node:assert/strict'
import test from 'node:test'
import { MockEtimsProvider } from '../lib/etims/providers/mock-provider'
import { createEtimsProvider } from '../lib/etims/provider-factory'
import { canVoidWithEtimsStatus, cashierEtimsLabel, etimsRequired, retryDisposition } from '../lib/etims/policy'
import type { EtimsConfigurationSnapshot, EtimsCreditNoteRequest, EtimsInvoice } from '../lib/etims/types'

const configuration = (overrides: Partial<EtimsConfigurationSnapshot> = {}): EtimsConfigurationSnapshot => ({
  id: 'cfg-1', organizationId: 'org-1', branchId: 'branch-1', enabled: true, environment: 'sandbox',
  integrationMethod: 'OSCU', providerName: 'mock', businessKraPin: 'A123456789X', vatRegistered: true,
  externalBranchId: '001', deviceId: 'POS-01', apiBaseUrl: null, credentialReference: null, clientId: null,
  clientSecretReference: null, certificateReference: null, privateKeyReference: null, tokenConfiguration: {},
  invoiceSubmissionEnabled: true, automaticRetryEnabled: true, maximumRetryAttempts: 5, receiptDetailsEnabled: true,
  ...overrides,
})

const invoice = (overrides: Partial<EtimsInvoice> = {}): EtimsInvoice => ({
  idempotencyKey: 'etims:invoice:org-1:sale-1', saleId: 'sale-1', receiptNumber: 'REC-001', issuedAt: new Date(0).toISOString(), currency: 'KES',
  business: { kraPin: 'A123456789X', branchId: '001', deviceId: 'POS-01' },
  customer: { name: null, kraPin: null, phone: null, email: null, customerType: null, vatRegistered: false },
  paymentMethod: 'cash', subtotal: 100, discountAmount: 0, taxAmount: 16, roundingAmount: 0, totalAmount: 116,
  lines: [{ lineNumber: 1, productId: 'p1', itemCode: 'ITEM', name: 'Bottle', unitCode: 'EA', quantity: 1,
    unitPrice: 100, grossAmount: 100, discountAmount: 0, taxableAmount: 100, taxAmount: 16, totalAmount: 116,
    taxCategory: 'STANDARD', taxRate: 16, vatClassification: 'VAT' }],
  ...overrides,
})

const creditNote = (): EtimsCreditNoteRequest => ({ idempotencyKey: 'etims:credit:org-1:return-1', returnId: 'return-1',
  returnNumber: 'RET-001', originalSaleId: 'sale-1', originalProviderSubmissionId: 'sub-1', reason: 'Returned', amount: 116,
  issuedAt: new Date(1).toISOString(), lines: [{ productId: 'p1', name: 'Bottle', quantity: 1, amount: 116 }] })

test('successful invoice submission returns explicit mock sandbox acceptance', async () => {
  const result = await new MockEtimsProvider(configuration()).submitInvoice(invoice())
  assert.equal(result.accepted, true); assert.match(result.submissionId!, /^MOCK-SBX-/)
})

test('duplicate invoice request returns the existing fiscal result', async () => {
  const provider = new MockEtimsProvider(configuration())
  const first = await provider.submitInvoice(invoice()); const second = await provider.submitInvoice(invoice())
  assert.equal(second.duplicate, true); assert.equal(second.submissionId, first.submissionId)
})

test('double-click concurrent submission is idempotent', async () => {
  const provider = new MockEtimsProvider(configuration())
  const [first, second] = await Promise.all([provider.submitInvoice(invoice()), provider.submitInvoice(invoice())])
  assert.equal(first.submissionId, second.submissionId); assert.equal([first.duplicate, second.duplicate].filter(Boolean).length, 1)
})

test('provider rejection is non-retryable validation failure', async () => {
  await assert.rejects(new MockEtimsProvider(configuration(), 'rejected').submitInvoice(invoice()), { name: 'EtimsValidationError' })
})

test('network timeout is retryable', async () => {
  await assert.rejects(new MockEtimsProvider(configuration(), 'timeout').submitInvoice(invoice()), { name: 'EtimsTemporaryError' })
})

test('temporary provider failure is retryable', async () => {
  await assert.rejects(new MockEtimsProvider(configuration(), 'temporary_failure').submitInvoice(invoice()), { name: 'EtimsTemporaryError' })
})

test('missing KRA PIN fails configuration validation', async () => {
  const result = await new MockEtimsProvider(configuration({ businessKraPin: null })).validateConfiguration(); assert.equal(result.valid, false)
})

test('missing branch mapping fails configuration validation', async () => {
  const result = await new MockEtimsProvider(configuration({ externalBranchId: null })).validateConfiguration(); assert.equal(result.valid, false)
})

test('disabled integration does not require fiscal submission', () => assert.equal(etimsRequired({ enabled: false, invoiceSubmissionEnabled: true }), false))
test('disabled invoice submission does not require fiscal submission', () => assert.equal(etimsRequired({ enabled: true, invoiceSubmissionEnabled: false }), false))
test('enabled integration requires fiscal submission', () => assert.equal(etimsRequired({ enabled: true, invoiceSubmissionEnabled: true }), true))

test('retryable failure schedules another attempt', () => assert.equal(retryDisposition({ retryable: true, automaticRetryEnabled: true, attempt: 1, maximumAttempts: 5 }).status, 'RETRYING'))
test('non-retryable failure requires review', () => assert.equal(retryDisposition({ retryable: false, automaticRetryEnabled: true, attempt: 1, maximumAttempts: 5 }).status, 'FAILED'))
test('maximum retry attempts stop the queue', () => assert.equal(retryDisposition({ retryable: true, automaticRetryEnabled: true, attempt: 5, maximumAttempts: 5 }).status, 'FAILED'))
test('automatic retry can be disabled', () => assert.equal(retryDisposition({ retryable: true, automaticRetryEnabled: false, attempt: 1, maximumAttempts: 5 }).status, 'FAILED'))

test('walk-in customer invoice remains valid', async () => assert.equal((await new MockEtimsProvider(configuration()).submitInvoice(invoice())).accepted, true))
test('customer KRA PIN is passed without changing provider lifecycle', async () => assert.equal((await new MockEtimsProvider(configuration()).submitInvoice(invoice({ customer: { name: 'Buyer Ltd', kraPin: 'P123456789X', phone: null, email: null, customerType: 'business', vatRegistered: true } }))).accepted, true))
test('cash invoice can be submitted', async () => assert.equal((await new MockEtimsProvider(configuration()).submitInvoice(invoice({ paymentMethod: 'cash' }))).accepted, true))
test('M-Pesa invoice can be submitted', async () => assert.equal((await new MockEtimsProvider(configuration()).submitInvoice(invoice({ paymentMethod: 'mpesa' }))).accepted, true))
test('card invoice can be submitted', async () => assert.equal((await new MockEtimsProvider(configuration()).submitInvoice(invoice({ paymentMethod: 'card' }))).accepted, true))

test('partial refund credit note is accepted once', async () => {
  const provider = new MockEtimsProvider(configuration()); const note = { ...creditNote(), amount: 58, lines: [{ productId: 'p1', name: 'Bottle', quantity: 1, amount: 58 }] }
  assert.equal((await provider.submitCreditNote(note)).accepted, true)
})

test('full refund credit note is idempotent', async () => {
  const provider = new MockEtimsProvider(configuration()); const first = await provider.submitCreditNote(creditNote()); const second = await provider.submitCreditNote(creditNote())
  assert.equal(first.submissionId, second.submissionId); assert.equal(second.duplicate, true)
})

test('accepted fiscal invoice cannot be voided', () => assert.equal(canVoidWithEtimsStatus('ACCEPTED'), false))
test('credited fiscal invoice cannot be voided', () => assert.equal(canVoidWithEtimsStatus('CREDITED'), false))
test('pending invoice retains correction path', () => assert.equal(canVoidWithEtimsStatus('PENDING'), true))

test('cashier labels do not expose raw provider errors', () => {
  assert.equal(cashierEtimsLabel('RETRYING'), 'eTIMS: Pending submission'); assert.equal(cashierEtimsLabel('FAILED'), 'eTIMS: Action required')
})

test('mock provider is impossible in production', () => assert.throws(() => createEtimsProvider(configuration({ environment: 'production' })), /mock eTIMS provider is restricted|mock/i))
test('unknown production provider is blocked until a certified adapter exists', () => assert.throws(() => createEtimsProvider(configuration({ environment: 'production', providerName: 'uninstalled-provider' })), /No certified adapter/))

test('separate branch providers do not share idempotency state', async () => {
  const first = new MockEtimsProvider(configuration({ branchId: 'branch-1', externalBranchId: '001' }))
  const second = new MockEtimsProvider(configuration({ branchId: 'branch-2', externalBranchId: '002' }))
  assert.notEqual((await first.submitInvoice(invoice({ saleId: 'sale-1' }))).duplicate, true)
  assert.notEqual((await second.submitInvoice(invoice({ saleId: 'sale-2' }))).duplicate, true)
})
