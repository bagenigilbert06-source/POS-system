import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { loadMpesaConfiguration, mpesaConfigurationStatus, type MpesaEnvironment } from './configuration'

type DarajaEnvironment = MpesaEnvironment

type StkPushResponse = {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

let accessTokenCache: { token: string; expiresAt: number } | null = null
let configurationDiagnosticLogged = false

/** Safe for server diagnostics: this intentionally never returns any value. */
export function mpesaConfigurationDiagnostic() {
  return mpesaConfigurationStatus()
}

function mpesaLog(event: string, details: Record<string, string | number | boolean> = {}) {
  // Deliberately limited to lifecycle state. Do not add tokens, credentials,
  // phone numbers, receipt numbers, callback payloads, or request bodies.
  console.info('[mpesa]', JSON.stringify({ event, ...details }))
}

export function darajaBaseUrl(environment: DarajaEnvironment) {
  return environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'
}

function configuration(requirePasskey = true) {
  const config = loadMpesaConfiguration({ requirePasskey, liveTransaction: true })
  if (!configurationDiagnosticLogged) {
    configurationDiagnosticLogged = true
    mpesaLog('CONFIGURATION', mpesaConfigurationDiagnostic())
  }
  return config
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' })
  } finally {
    clearTimeout(timeout)
  }
}

async function accessToken() {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 30_000) return accessTokenCache.token
  const config = configuration(false)
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')
  mpesaLog('OAUTH_REQUEST', { environment: config.environment })
  const response = await fetchWithTimeout(`${darajaBaseUrl(config.environment)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
  })
  const body = await response.json() as { access_token?: string; expires_in?: string; errorMessage?: string }
  if (!response.ok || !body.access_token) {
    mpesaLog('OAUTH_FAILURE', { environment: config.environment, httpStatus: response.status })
    throw new Error(body.errorMessage || 'Could not authenticate with Safaricom Daraja')
  }
  mpesaLog('OAUTH_SUCCESS', { environment: config.environment })
  accessTokenCache = { token: body.access_token, expiresAt: Date.now() + (Number(body.expires_in || 3599) * 1000) }
  return body.access_token
}

function darajaTimestamp() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}${value('month')}${value('day')}${value('hour')}${value('minute')}${value('second')}`
}

export function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`
  if (/^254[17]\d{8}$/.test(digits)) return digits
  throw new Error('Enter a valid M-Pesa phone number.')
}

export function friendlyMpesaFailure(resultCode: number, resultDescription?: string) {
  if (resultCode === 1) return 'Insufficient M-Pesa balance'
  if (resultCode === 1032) return 'The customer cancelled the M-Pesa request.'
  if (resultCode === 1037) return 'No M-Pesa confirmation was received in time.'
  if (resultCode === 2001) return 'The customer entered an incorrect M-Pesa PIN.'
  if (/insufficient/i.test(resultDescription || '')) return 'Insufficient M-Pesa balance'
  return 'Payment could not be completed. Please try again or choose another payment method.'
}

export type MpesaCallbackPurpose = 'stk' | 'c2b-validation' | 'c2b-confirmation'

export function callbackAuthenticationToken(purpose: MpesaCallbackPurpose = 'stk') {
  const secret = process.env.MPESA_CALLBACK_SECRET?.trim()
  if (!secret) return null
  // Daraja can only return the configured URL. Send a purpose-bound derived
  // bearer token, never the raw server secret itself.
  return createHmac('sha256', secret).update(`pesaby:daraja:${purpose}-callback:v1`).digest('base64url')
}

function callbackUrl(configuredUrl: string, purpose: MpesaCallbackPurpose = 'stk') {
  const token = callbackAuthenticationToken(purpose)
  if (!token) return configuredUrl
  const url = new URL(configuredUrl)
  url.searchParams.set('token', token)
  return url.toString()
}

export async function requestStkPush(input: { phone: string; amount: number; accountReference: string }) {
  const config = configuration(true)
  const shortcode = config.shortcode
  const timestamp = darajaTimestamp()
  const password = Buffer.from(`${shortcode}${config.passkey!}${timestamp}`).toString('base64')
  const token = await accessToken()
  mpesaLog('STK_REQUEST', { environment: config.environment, amount: input.amount })
  const response = await fetchWithTimeout(`${darajaBaseUrl(config.environment)}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: config.transactionType,
      Amount: input.amount,
      PartyA: input.phone,
      PartyB: shortcode,
      PhoneNumber: input.phone,
      CallBackURL: callbackUrl(config.callbackUrl),
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: 'POS purchase',
    }),
  })
  const body = await response.json() as Partial<StkPushResponse> & { errorMessage?: string; errorCode?: string }
  if (!response.ok || body.ResponseCode !== '0' || !body.CheckoutRequestID || !body.MerchantRequestID) {
    mpesaLog('STK_REJECTED', { environment: config.environment, httpStatus: response.status })
    throw new Error(body.errorMessage || body.ResponseDescription || 'Safaricom could not start the M-Pesa prompt')
  }
  mpesaLog('STK_ACCEPTED', { environment: config.environment })
  return body as StkPushResponse
}

function c2bCallbackUrl(pathname: string, purpose: Extract<MpesaCallbackPurpose, `c2b-${string}`>) {
  const config = configuration(false)
  const url = new URL(config.callbackUrl)
  url.pathname = pathname
  url.search = ''
  return callbackUrl(url.toString(), purpose)
}

export function mpesaPaybillDetails() {
  const config = configuration(false)
  const accountType = (process.env.MPESA_C2B_TYPE || 'paybill').toLowerCase() === 'till' ? 'till' : 'paybill'
  return { shortcode: config.shortcode, accountType: accountType as 'paybill' | 'till' }
}

export function validC2bShortcode(value: string) {
  try { return configuration(false).shortcode === value.trim() } catch { return false }
}

/** Registers the public C2B validation and confirmation endpoints with Daraja. */
export async function registerC2bUrls() {
  const config = configuration(false)
  const token = await accessToken()
  const response = await fetchWithTimeout(`${darajaBaseUrl(config.environment)}/mpesa/c2b/v1/registerurl`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      ShortCode: config.shortcode,
      ResponseType: 'Completed',
      ConfirmationURL: c2bCallbackUrl('/api/mpesa/c2b/confirmation', 'c2b-confirmation'),
      ValidationURL: c2bCallbackUrl('/api/mpesa/c2b/validation', 'c2b-validation'),
    }),
  })
  const body = await response.json() as { ResponseCode?: string; ResponseDescription?: string; errorMessage?: string }
  if (!response.ok || (body.ResponseCode && body.ResponseCode !== '0')) throw new Error(body.errorMessage || body.ResponseDescription || 'Could not register M-Pesa PayBill callback URLs')
  return body
}

export function validCallbackToken(value: string | null, purpose: MpesaCallbackPurpose = 'stk') {
  const expected = callbackAuthenticationToken(purpose)
  if (!expected) return false
  if (!value) return false
  const left = createHash('sha256').update(value).digest()
  const right = createHash('sha256').update(expected).digest()
  return timingSafeEqual(left, right)
}
