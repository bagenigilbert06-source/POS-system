import assert from 'node:assert/strict'
import test from 'node:test'
import { buildEscPosReceipt, receiptItemLines, thermalColumns, wrapThermalText, type ThermalReceiptModel } from '../lib/printing/thermal-receipt'

const model: ThermalReceiptModel = {
  version: 1, businessName: 'LIQUOR STORE', contactLines: ['Ruiru', 'Tel: +254700000000'],
  title: 'Sales receipt', metadata: ['8 Sept 2026, 12:09', 'Receipt: RCP-260908-8206', 'Cashier: JAMES MILLER', 'Customer: Walk-in customer'],
  items: [{ description: 'Moet & Chandon Imperial Champagne Extra Long Name', quantity: '1', amount: 'KSh 10,500.00' }],
  totals: [{ label: 'Total before VAT', amount: 'KSh 9,051.72' }, { label: 'VAT (16%) included', amount: 'KSh 1,448.28' }],
  total: { label: 'TOTAL', amount: 'KSh 10,500.00' }, itemCountLabel: '1 item sold',
  paymentLines: ['Paid by: Cash', 'Amount paid: KSh 10,500.00'], footer: 'Thank you for your business.', transactionId: '4510A6C1',
}

test('thermal columns and long item names remain aligned', () => {
  for (const width of [58, 80] as const) {
    assert.equal(thermalColumns(width), width === 58 ? 32 : 48)
    assert.ok(receiptItemLines(model.items[0], width).every((line) => line.length <= thermalColumns(width)))
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
})
