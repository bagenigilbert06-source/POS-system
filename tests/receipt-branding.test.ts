import assert from 'node:assert/strict'
import { receiptLogoForTemplate } from '../lib/printing/receipt-branding'

const savedLogo = '/uploads/receipt-logo.webp'

assert.equal(receiptLogoForTemplate('logo', savedLogo), savedLogo)
assert.equal(receiptLogoForTemplate('classic', savedLogo), '')
assert.equal(receiptLogoForTemplate('cafe', savedLogo), '')
assert.equal(receiptLogoForTemplate('logo', '  /logo.png  '), '/logo.png')
assert.equal(receiptLogoForTemplate('logo', ''), '')

console.log('Receipt branding template rules passed')
