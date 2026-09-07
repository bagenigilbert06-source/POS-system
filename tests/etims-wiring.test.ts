import assert from 'node:assert/strict'
import test from 'node:test'
import { randomBytes } from 'node:crypto'
import { decryptEtimsSecret, encryptEtimsSecret, redactEtimsSecrets } from '../lib/etims/secret-store'
import { getProductFiscalReadiness } from '../lib/etims/product-readiness'
import { readFiscalSnapshot, reconstructCreditLines } from '../lib/etims/fiscal-snapshot'
import type { EtimsInvoice } from '../lib/etims/types'

const key = { key: randomBytes(32), version: 7 }
const scope = { organizationId: 'tenant-a', branchId: 'branch-a', provider: 'KRA_OSCU', environment: 'sandbox' }

test('cmcKey is encrypted at rest and decrypts only in its authenticated scope', () => {
  const encrypted = encryptEtimsSecret('issued-cmc-key', scope, 'cmcKey', key)
  assert.equal(JSON.stringify(encrypted).includes('issued-cmc-key'), false)
  assert.equal(decryptEtimsSecret(encrypted, scope, 'cmcKey', key), 'issued-cmc-key')
  assert.throws(() => decryptEtimsSecret(encrypted, { ...scope, organizationId: 'tenant-b' }, 'cmcKey', key))
  assert.throws(() => decryptEtimsSecret(encrypted, { ...scope, branchId: 'branch-b' }, 'cmcKey', key))
})

test('audit/browser serializers recursively remove secret material', () => {
  const safe = redactEtimsSecrets({ ok: true, cmcKey: 'secret', nested: { credentialValue: 'secret', status: 'ACTIVE' } })
  assert.deepEqual(safe, { ok: true, nested: { status: 'ACTIVE' } })
})

const completeProduct = { etimsItemCode: 'KE2NTU0000001', etimsItemClassificationCode: '5059690800', etimsItemTypeCode: '2', etimsOriginCountryCode: 'KE', etimsPackagingUnitCode: 'NT', etimsQuantityUnitCode: 'U', etimsTaxCategory: 'B', etimsRegistrationStatus: 'REGISTERED' }
test('single readiness validator reports ready, incomplete, registration required and registration error', () => {
  assert.equal(getProductFiscalReadiness(completeProduct).status, 'READY')
  assert.deepEqual(getProductFiscalReadiness({ ...completeProduct, etimsItemClassificationCode: null }).missing, ['classification'])
  assert.deepEqual(getProductFiscalReadiness({ ...completeProduct, etimsPackagingUnitCode: null, etimsQuantityUnitCode: null }).missing, ['packaging unit', 'quantity unit'])
  assert.equal(getProductFiscalReadiness({ ...completeProduct, etimsRegistrationStatus: 'NOT_REGISTERED' }).status, 'REGISTRATION_REQUIRED')
  assert.equal(getProductFiscalReadiness({ ...completeProduct, etimsRegistrationStatus: 'ERROR' }).status, 'REGISTRATION_ERROR')
})

const snapshot: EtimsInvoice = { idempotencyKey: 'key', saleId: 'sale', receiptNumber: 'R-1', providerInvoiceNumber: 41, issuedAt: '2026-01-01T00:00:00Z', currency: 'KES', business: { kraPin: 'A123456789Z', branchId: '00', deviceId: 'device' }, customer: { name: null, kraPin: null, phone: null, email: null, customerType: null, vatRegistered: false }, paymentMethod: 'cash', subtotal: 232, discountAmount: 0, taxAmount: 32, roundingAmount: 0, totalAmount: 232, lines: [{ lineNumber: 1, saleItemId: 'sale-item-1', productId: 'p1', itemCode: 'KE2NTU0000001', classificationCode: '5059690800', packagingUnitCode: 'NT', packageQuantity: 2, name: 'Original name', unitCode: 'U', quantity: 2, unitPrice: 116, grossAmount: 232, discountAmount: 0, taxableAmount: 200, taxAmount: 32, totalAmount: 232, taxCategory: 'B', taxRate: 16, vatClassification: 'B' }] }

test('partial credit note preserves original price, tax and classification', () => {
  const original = readFiscalSnapshot(structuredClone(snapshot))
  const [line] = reconstructCreditLines(original, [{ originalSaleItemId: 'sale-item-1', productId: 'p1', quantity: 1 }])
  assert.equal(line.quantity, 1); assert.equal(line.unitPrice, 116); assert.equal(line.taxAmount, 16); assert.equal(line.classificationCode, '5059690800'); assert.equal(line.totalAmount, 116)
})

test('fiscal snapshot preserves original invoice reference', () => assert.equal(readFiscalSnapshot(snapshot).providerInvoiceNumber, 41))
