import assert from 'node:assert/strict'
import { authorizesRestrictedCheckout, effectiveAgeRestriction, maskAgeIdReference } from '../lib/pos/age-verification'

assert.equal(maskAgeIdReference('12345678'), '****5678')
assert.equal(maskAgeIdReference('  AB 12 34  '), '****1234')
assert.equal(maskAgeIdReference(), null)
assert.equal(authorizesRestrictedCheckout('VERIFIED'), true)
assert.equal(authorizesRestrictedCheckout('OVERRIDDEN'), true)
assert.equal(authorizesRestrictedCheckout('CANCELLED'), false)
assert.equal(effectiveAgeRestriction(true, false, false), true)
assert.equal(effectiveAgeRestriction(false, true, true), false)
assert.equal(effectiveAgeRestriction(null, true, false), true)
assert.equal(effectiveAgeRestriction(null, null, true), true)
// An unrestricted product/category must not become restricted solely because
// it belongs to a liquor workspace; the server uses the product/category flag.
assert.equal(effectiveAgeRestriction(null, null, false), false)
console.log('age-verification rules tests passed')
