import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyKraResultCode,
  mapCreditReason,
  mapKraPaymentMethod,
  normalizeKraSalesResponse,
  parseDeviceInitialization,
  serializeDeviceInitialization,
  serializeKraSale,
} from '../lib/etims/providers/kra-oscu-provider'
import type { EtimsInvoice } from '../lib/etims/types'

const invoice = (): EtimsInvoice => ({
  idempotencyKey: 'local-only-idempotency-key', saleId: 'sale-1', receiptNumber: 'POS-2026-0001', providerInvoiceNumber: 1,
  issuedAt: '2026-09-07T09:03:04.000Z', currency: 'KES', business: { kraPin: 'A123456789Z', branchId: '00', deviceId: 'approved-device' },
  customer: { name: null, kraPin: null, phone: null, email: null, customerType: null, vatRegistered: false },
  paymentMethod: 'cash', subtotal: 100, discountAmount: 0, taxAmount: 16, roundingAmount: 0, totalAmount: 116,
  lines: [{ lineNumber: 1, productId: 'product-1', classificationCode: '5059690800', itemCode: 'KE2NTU0000001', name: 'Sanitized item',
    packagingUnitCode: 'NT', packageQuantity: 1, unitCode: 'U', quantity: 1, unitPrice: 116, grossAmount: 116, discountAmount: 0,
    taxableAmount: 100, taxAmount: 16, totalAmount: 116, taxCategory: 'B', taxRate: 16, vatClassification: 'B' }],
})

test('serializes the exact initialization field names', () => assert.deepEqual(serializeDeviceInitialization({ taxpayerPin: 'A123456789Z', branchId: '00', deviceSerial: 'approved-device' }), { tin: 'A123456789Z', bhfId: '00', dvcSrlNo: 'approved-device' }))

test('parses initialization and keeps cmcKey behind an explicit secret boundary', () => {
  const parsed = parseDeviceInitialization({ resultCd: '000', resultMsg: 'It is succeeded', resultDt: '20260907120304', data: { info: { tin: 'A123456789Z', taxprNm: 'Example taxpayer', bhfId: '00', bhfNm: 'Head office', dvcId: '12345678901234567890', sdcId: '123456789012345678', mrcNo: '12345678901', cmcKey: 'server-secret-value' } } })
  assert.equal(parsed.ok, true)
  if (parsed.ok) { assert.equal(parsed.secret.cmcKey, 'server-secret-value'); assert.equal(JSON.stringify(parsed.publicInfo).includes('server-secret-value'), false) }
})

test('maps cash, card and M-Pesa to documented KRA codes', () => {
  assert.equal(mapKraPaymentMethod('cash'), '01'); assert.equal(mapKraPaymentMethod('card'), '05'); assert.equal(mapKraPaymentMethod('M-Pesa'), '06')
})

test('serializes a sale with receipt and itemList contracts', () => {
  const request = serializeKraSale(invoice(), 'private-cmc-key')
  assert.equal(request.rcptTyCd, 'S'); assert.equal(request.pmtTyCd, '01'); assert.equal(request.salesSttsCd, '02')
  assert.equal(request.itemList[0].itemClsCd, '5059690800'); assert.equal(request.itemList[0].pkgUnitCd, 'NT')
  assert.equal('idempotencyKey' in request, false)
})

test('serializes credit note through the sales endpoint contract', () => {
  const request = serializeKraSale(invoice(), 'private-cmc-key', { originalInvoiceNumber: 41, reasonCode: '06', issuedAt: '2026-09-07T09:03:04.000Z' })
  assert.equal(request.rcptTyCd, 'R'); assert.equal(request.orgInvcNo, 41); assert.equal(request.rfdRsnCd, '06'); assert.equal(request.salesSttsCd, '05')
})

test('maps documented credit-note reasons conservatively', () => { assert.equal(mapCreditReason('Damaged item'), '03'); assert.equal(mapCreditReason('Customer refund'), '06') })

test('normalizes all documented fiscal receipt fields', () => {
  const result = normalizeKraSalesResponse({ resultCd: '000', resultMsg: 'It is succeeded', resultDt: '20260907120304', data: { curRcptNo: 12, totRcptNo: 40, intrlData: 'EAHSAV6ECUUXSY6PCCJYAUP6MI', rcptSign: 'QUII27MATATSHFRB', sdcDateTime: '20260907120304' } })
  assert.equal(result.accepted, true); assert.equal(result.receiptNumber, '12'); assert.equal(result.controlNumber, '40'); assert.equal(result.internalReference, 'EAHSAV6ECUUXSY6PCCJYAUP6MI'); assert.equal(result.verificationData, 'QUII27MATATSHFRB')
})

test('classifies result codes without making all failures retryable', () => {
  assert.equal(classifyKraResultCode('000'), 'SUCCESS'); assert.equal(classifyKraResultCode('001'), 'NO_RESULT'); assert.equal(classifyKraResultCode('901'), 'DEVICE_ERROR')
  assert.equal(classifyKraResultCode('910'), 'REQUEST_ERROR'); assert.equal(classifyKraResultCode('994'), 'DUPLICATE'); assert.equal(classifyKraResultCode('894'), 'COMMUNICATION_ERROR'); assert.equal(classifyKraResultCode('991'), 'REGISTRATION_ERROR'); assert.equal(classifyKraResultCode('992'), 'MODIFICATION_ERROR'); assert.equal(classifyKraResultCode('999'), 'UNKNOWN_SERVER_FAILURE')
})

test('rejects malformed responses and never echoes a provider message', () => {
  assert.throws(() => normalizeKraSalesResponse({ resultCd: '000', resultMsg: 'secret-like text', resultDt: '20260907120304', data: null }), /malformed fiscal receipt/)
  const failure = normalizeKraSalesResponse({ resultCd: '910', resultMsg: 'do-not-expose-this', resultDt: '20260907120304' })
  assert.equal(JSON.stringify(failure).includes('do-not-expose-this'), false); assert.equal(failure.retryable, false)
})
