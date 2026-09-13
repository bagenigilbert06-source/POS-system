import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { callbackAuthenticationToken } from '../lib/mpesa/daraja'
import { POST as aliasValidation } from '../app/api/c2b/validation/route'
import { POST as aliasConfirmation } from '../app/api/c2b/confirmation/route'
import { POST as legacyValidation } from '../app/api/mpesa/c2b/validation/route'
import { POST as legacyConfirmation } from '../app/api/mpesa/c2b/confirmation/route'

const previousSecret = process.env.MPESA_CALLBACK_SECRET
process.env.MPESA_CALLBACK_SECRET = 'route-security-test-secret'

const post = (url: string) => new NextRequest(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({}),
})

async function run() {
  try {
    assert.equal((await aliasValidation(post('https://example.test/api/c2b/validation'))).status, 401)
    assert.equal((await aliasConfirmation(post('https://example.test/api/c2b/confirmation'))).status, 401)
    assert.equal((await legacyValidation(post('https://example.test/api/mpesa/c2b/validation'))).status, 401)
    assert.equal((await legacyConfirmation(post('https://example.test/api/mpesa/c2b/confirmation'))).status, 401)

    const validationToken = callbackAuthenticationToken('c2b-validation')!
    const confirmationToken = callbackAuthenticationToken('c2b-confirmation')!
    assert.equal((await aliasValidation(post(`https://example.test/api/c2b/validation?token=${confirmationToken}`))).status, 401)
    assert.equal((await aliasConfirmation(post(`https://example.test/api/c2b/confirmation?token=${validationToken}`))).status, 401)
  } finally {
    if (previousSecret === undefined) delete process.env.MPESA_CALLBACK_SECRET
    else process.env.MPESA_CALLBACK_SECRET = previousSecret
  }
}

void run().then(() => console.log('M-Pesa C2B alias and legacy route security tests passed')).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
