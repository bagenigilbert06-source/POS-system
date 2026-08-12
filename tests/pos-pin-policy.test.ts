import assert from 'node:assert/strict'
import { validatePosPin, POS_PIN_LENGTH, POS_PIN_MAX_ATTEMPTS } from '../lib/pos/pin-policy'
assert.equal(POS_PIN_LENGTH, 6)
assert.equal(POS_PIN_MAX_ATTEMPTS, 5)
assert.equal(validatePosPin('482905'), null)
for (const weak of ['000000','111111','123456','654321']) assert.ok(validatePosPin(weak), `${weak} must be rejected`)
for (const invalid of ['12345','1234567','12a456','']) assert.ok(validatePosPin(invalid), `${invalid} must be rejected`)
console.log('POS PIN policy unit test passed')
