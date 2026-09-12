import assert from 'node:assert/strict'
import { callbackAuthenticationToken, darajaBaseUrl, friendlyMpesaFailure, mpesaConfigurationDiagnostic, normalizeKenyanPhone, requestStkPush, validCallbackToken } from '../lib/mpesa/daraja'
import { normalizeMpesaPhoneForMode } from '../lib/mpesa/phone-validation'
import { calculateMpesaAmount } from '../lib/mpesa/amount'
import { selectUnambiguousTillCandidate } from '../lib/mpesa/matching'
import { callbackAmountMatches, matchesBranchTill } from '../lib/mpesa/merchant-rules'

assert.equal(normalizeKenyanPhone('0712 345 678'), '254712345678')
assert.equal(normalizeKenyanPhone('+254 712 345 678'), '254712345678')
assert.equal(normalizeKenyanPhone('712345678'), '254712345678')
assert.equal(normalizeKenyanPhone('0112 345 678'), '254112345678')
assert.equal(normalizeKenyanPhone('254712345678'), '254712345678')
assert.throws(() => normalizeKenyanPhone('020 123 4567'), /Enter a valid M-Pesa phone number/)
assert.throws(() => normalizeMpesaPhoneForMode('stk', ''), /Enter a valid M-Pesa phone number/)
assert.throws(() => normalizeMpesaPhoneForMode('stk', '020 123 4567'), /Enter a valid M-Pesa phone number/)
assert.equal(normalizeMpesaPhoneForMode('stk', '0712 345 678'), '254712345678')
assert.equal(normalizeMpesaPhoneForMode('till', ''), '')
assert.equal(normalizeMpesaPhoneForMode('till', null), '')
assert.equal(normalizeMpesaPhoneForMode('till', '0712 345 678'), '254712345678')
assert.equal(normalizeMpesaPhoneForMode('paybill', ''), '')
assert.equal(normalizeMpesaPhoneForMode('paybill', null), '')
assert.equal(normalizeMpesaPhoneForMode('paybill', '+254 712 345 678'), '254712345678')
assert.equal(friendlyMpesaFailure(1, 'The balance is insufficient'), 'Insufficient M-Pesa balance')
assert.match(friendlyMpesaFailure(1032), /cancelled/i)
assert.match(friendlyMpesaFailure(1037), /confirmation/i)
assert.match(friendlyMpesaFailure(2001), /incorrect M-Pesa PIN/i)
assert.deepEqual(calculateMpesaAmount(2917.4), { amount: 2917, roundingAmount: -0.4 })
assert.deepEqual(calculateMpesaAmount(2917.6), { amount: 2918, roundingAmount: 0.4 })
assert.deepEqual(calculateMpesaAmount(2917), { amount: 2917, roundingAmount: 0 })
assert.equal(selectUnambiguousTillCandidate([], 1500), null)
assert.equal(selectUnambiguousTillCandidate([{ id: 'one', amount: '1500.00' }], 1500)?.id, 'one')
assert.equal(selectUnambiguousTillCandidate([{ id: 'one', amount: '1500.00' }, { id: 'two', amount: '1500.00' }], 1500), null)
assert.equal(selectUnambiguousTillCandidate([{ id: 'wrong', amount: '1499.00' }], 1500), null)
// A Buy Goods Till is branch-bound and is never silently promoted to an STK shortcode.
assert.equal(matchesBranchTill({ configuredTill: '1704604', callbackShortcode: '1704604', manualTillEnabled: true }), true)
assert.equal(matchesBranchTill({ configuredTill: '1704604', callbackShortcode: '174379', manualTillEnabled: true }), false)
assert.equal(matchesBranchTill({ configuredTill: '1704604', callbackShortcode: '1704604', manualTillEnabled: false }), false)
assert.equal(callbackAmountMatches('1500.00', 1500), true)
assert.equal(callbackAmountMatches('1500.00', 1499), false)
assert.equal(darajaBaseUrl('sandbox'), 'https://sandbox.safaricom.co.ke')
assert.equal(darajaBaseUrl('production'), 'https://api.safaricom.co.ke')

// The customer-facing Till is never the sandbox STK shortcode.
const manualUi = require('node:fs').readFileSync('components/pos/pos-terminal.tsx', 'utf8')
assert.match(manualUi, /Buy Goods Till/)
assert.match(manualUi, /Exact amount due/)
const callbackRoute = require('node:fs').readFileSync('app/api/mpesa/callback/route.ts', 'utf8')
const mpesaActions = require('node:fs').readFileSync('app/actions/mpesa.ts', 'utf8')
const merchantConfiguration = require('node:fs').readFileSync('lib/mpesa/merchant-configuration.ts', 'utf8')
const proxy = require('node:fs').readFileSync('proxy.ts', 'utf8')
assert.match(callbackRoute, /export async function POST/)
assert.match(mpesaActions, /return \{ success: false as const, error: safeMpesaActionError\(error\) \}/)
assert.match(merchantConfiguration, /MPESA_ENV[\s\S]*MPESA_TILL_NUMBER[\s\S]*MPESA_BUSINESS_SHORTCODE/)
assert.doesNotMatch(callbackRoute, /getAuthorizationContext|requirePermission|cookies\(/)
assert.match(proxy, /matcher: \['\/dashboard\/:path\*'\]/)

const previousEnvironment = process.env.MPESA_ENV
const previousSecret = process.env.MPESA_CALLBACK_SECRET
process.env.MPESA_ENV = 'production'
process.env.MPESA_CALLBACK_SECRET = 'test-callback-secret'
const callbackToken = callbackAuthenticationToken()
assert.ok(callbackToken)
assert.notEqual(callbackToken, 'test-callback-secret')
assert.equal(validCallbackToken(callbackToken), true)
assert.equal(validCallbackToken('wrong-secret'), false)
assert.equal(validCallbackToken(null), false)
process.env.MPESA_ENV = previousEnvironment
process.env.MPESA_CALLBACK_SECRET = previousSecret

async function testSandboxStkRequest() {
  const names = ['MPESA_ENV', 'MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_BUSINESS_SHORTCODE', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL', 'MPESA_CALLBACK_SECRET'] as const
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  const originalFetch = global.fetch
  const calls: Array<{ url: string; init?: RequestInit }> = []
  try {
    process.env.MPESA_ENV = 'sandbox'
    process.env.MPESA_CONSUMER_KEY = 'sandbox-key-for-test'
    process.env.MPESA_CONSUMER_SECRET = 'sandbox-secret-for-test'
    process.env.MPESA_BUSINESS_SHORTCODE = '174379'
    delete process.env.MPESA_SHORTCODE
    process.env.MPESA_PASSKEY = 'sandbox-passkey-for-test'
    process.env.MPESA_CALLBACK_URL = 'https://sandbox-test.example/api/mpesa/callback'
    process.env.MPESA_CALLBACK_SECRET = 'sandbox-callback-secret-for-test'
    assert.deepEqual(mpesaConfigurationDiagnostic(), {
      environment: 'sandbox', consumerKeyConfigured: true, consumerSecretConfigured: true,
      businessShortCodeConfigured: true, passkeyConfigured: true,
      callbackUrlConfigured: true, callbackUrlPublicLooking: true,
    })
    global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      if (String(url).includes('/oauth/'))
        return new Response(JSON.stringify({ access_token: 'test-token', expires_in: '3600' }), { status: 200 })
      return new Response(JSON.stringify({ ResponseCode: '0', MerchantRequestID: 'merchant-test', CheckoutRequestID: 'checkout-test', ResponseDescription: 'Accepted', CustomerMessage: 'Prompt sent' }), { status: 200 })
    }) as typeof fetch
    const result = await requestStkPush({ phone: '254712345678', amount: 100, accountReference: 'POS-TEST' })
    assert.equal(result.CheckoutRequestID, 'checkout-test')
    assert.match(calls[0].url, /^https:\/\/sandbox\.safaricom\.co\.ke\/oauth\//)
    assert.match(calls[1].url, /^https:\/\/sandbox\.safaricom\.co\.ke\/mpesa\/stkpush/)
    const body = JSON.parse(String(calls[1].init?.body))
    assert.equal(body.BusinessShortCode, '174379')
    assert.equal(body.PartyB, '174379')
    assert.equal(body.PhoneNumber, '254712345678')
    const callback = new URL(body.CallBackURL)
    assert.equal(callback.origin + callback.pathname, 'https://sandbox-test.example/api/mpesa/callback')
    assert.ok(callback.searchParams.get('token'))
    assert.notEqual(callback.searchParams.get('token'), 'sandbox-callback-secret-for-test')
    assert.equal(validCallbackToken(callback.searchParams.get('token')), true)
  } finally {
    global.fetch = originalFetch
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name]
      else process.env[name] = previous[name]
    }
  }
}

void testSandboxStkRequest().then(() => {
  console.log('M-Pesa phone, sandbox STK, and callback security rules test passed')
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
