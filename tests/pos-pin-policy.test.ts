import assert from 'node:assert/strict'
import { findPosPinOwners, validatePosPin, POS_PIN_LENGTH, POS_PIN_MAX_ATTEMPTS } from '../lib/pos/pin-policy'
assert.equal(POS_PIN_LENGTH, 6)
assert.equal(POS_PIN_MAX_ATTEMPTS, 5)
assert.equal(validatePosPin('482905'), null)
for (const weak of ['000000','111111','123456','654321']) assert.ok(validatePosPin(weak), `${weak} must be rejected`)
for (const invalid of ['12345','1234567','12a456','']) assert.ok(validatePosPin(invalid), `${invalid} must be rejected`)

async function run() {
  const cashiers = [
    { userId: 'cashier-a', pinHash: 'hash-200000' },
    { userId: 'cashier-b', pinHash: 'hash-300000' },
  ]
  const verify = async ({ pinHash }: { userId: string; pinHash: string }, pin: string) => pinHash === `hash-${pin}`

  assert.deepEqual(await findPosPinOwners('200000', cashiers, verify), ['cashier-a'])
  assert.deepEqual(await findPosPinOwners('300000', cashiers, verify), ['cashier-b'])
  assert.deepEqual(await findPosPinOwners('400000', cashiers, verify), [])
  assert.deepEqual(
    await findPosPinOwners('200000', [...cashiers, { userId: 'cashier-c', pinHash: 'hash-200000' }], verify),
    ['cashier-a', 'cashier-c'],
    'duplicate PINs must be detectable so login never selects an arbitrary cashier'
  )
  console.log('POS PIN policy unit test passed')
}

void run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
