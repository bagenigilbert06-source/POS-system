import assert from 'node:assert/strict'
import test from 'node:test'
import { buildEscPosReceipt, receiptItemLines, thermalColumns, wrapThermalText, type ThermalReceiptModel } from '../lib/printing/thermal-receipt'

const model: ThermalReceiptModel = {
  version: 1, businessName: 'LIQUOR STORE', contactLines: ['Ruiru', 'Tel: +254700000000'],
  title: 'Sales receipt', metadata: ['8 Sept 2026, 12:09', 'Receipt: RCP-260908-8206', 'Cashier: JAMES MILLER', 'Customer: Walk-in customer'],
  items: [{ description: 'Moet & Chandon Imperial Champagne Extra Long Name', quantity: '1', unitPrice: 'KSh 10,500.00', amount: 'KSh 10,500.00' }],
  totals: [{ label: 'Total before VAT', amount: 'KSh 9,051.72' }, { label: 'VAT (16%) included', amount: 'KSh 1,448.28' }],
  total: { label: 'TOTAL', amount: 'KSh 10,500.00' }, itemCountLabel: '1 item sold',
  paymentLines: ['Paid by: Cash', 'Amount paid: KSh 10,500.00'], footer: 'Thank you for your business.', transactionId: '4510A6C1',
}

test('thermal columns and long item names remain aligned', () => {
  for (const width of [58, 80] as const) {
    assert.equal(thermalColumns(width), width === 58 ? 32 : 48)
    const lines = receiptItemLines({ ...model.items[0], details: ['SKU: LONG-CODE'] }, width)
    assert.ok(lines.every((line) => line.length === thermalColumns(width)))
    assert.match(lines[0], /Moet .*\s+1\s+KSh 10,500\.00$/)
  }
})

test('wrapping never emits an empty line for a normal product name', () => {
  assert.deepEqual(wrapThermalText('A reasonably long product name', 12), ['A reasonably', 'long product', 'name'])
})

test('ESC/POS output is native bytes with QR and cut support', () => {
  const output = buildEscPosReceipt({ ...model, qrCodes: [{ value: 'PESABY RECEIPT\nRCP-1', label: 'Scan for receipt details' }] }, 80)
  assert.ok(output.includes(0x1b) && output.includes(0x1d))
  assert.deepEqual(Array.from(output.slice(-4)), [0x1d, 0x56, 0x41, 0x03])
  assert.equal(new TextDecoder().decode(output).includes('<style>'), false)
  assert.deepEqual(Array.from(output.slice(2, 5)), [0x1b, 0x74, 0x00])
  assert.ok(output.includes(0x1b) && output.includes(0x4d))
  assert.equal(output.some((byte, index) => byte === 0x01 && output[index - 1] === 0x4d && output[index - 2] === 0x1b), false, 'default receipt must not enable Font B')
  assert.deepEqual(Array.from(output.slice(0, 31)), [0x1b, 0x40, 0x1b, 0x74, 0x00, 0x1b, 0x4d, 0x00, 0x1b, 0x21, 0x00, 0x1b, 0x45, 0x00, 0x1b, 0x47, 0x00, 0x1b, 0x2d, 0x00, 0x1d, 0x21, 0x00, 0x1d, 0x4c, 0x00, 0x00, 0x1d, 0x57, 0x40, 0x02], 'receipt must reset normal-weight full-width printing before content')
})

test('80 mm output keeps a large mixed receipt readable', () => {
  const output = buildEscPosReceipt({
    ...model,
    kraPin: 'P051234567X',
    items: Array.from({ length: 12 }, (_, index) => ({
      description: index === 0 ? 'Moet & Chandon Imperial Brut Champagne Very Long Product Name' : `Liquor product ${index + 1}`,
      quantity: String(index + 1),
      unitPrice: 'KSh 12,999.99',
      amount: 'KSh 155,999.88',
      details: [`SKU: LIQ-${String(index + 1).padStart(4, '0')}`],
    })),
    totals: [
      { label: 'Subtotal', amount: 'KSh 1,400,000.00' },
      { label: 'VAT (16%)', amount: 'KSh 224,000.00' },
      { label: 'Discount', amount: '-KSh 10,000.00' },
    ],
    total: { label: 'TOTAL', amount: 'KSh 1,614,000.00' },
    paymentLines: ['Paid by: Cash', 'Change: KSh 386,000.00', 'M-Pesa ref: QWE123ABC'],
    qrCodes: [{ value: 'https://example.test/receipt/RCP-1', label: 'Scan to verify receipt' }],
  }, 80)
  const text = new TextDecoder().decode(output)
  assert.match(text, /KRA PIN: P051234567X/)
  assert.match(text, /SKU: LIQ-0010/)
  assert.match(text, /KSh 1,614,000\.00/)
  assert.ok(output.length > 2_000)
})
