import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

type DarajaEnvironment = 'sandbox' | 'production'

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
  const callbackUrl = process.env.MPESA_CALLBACK_URL?.trim()
  let callbackPublicLooking = false
  try {
    const callback = callbackUrl ? new URL(callbackUrl) : null
    callbackPublicLooking = Boolean(callback && callback.protocol === 'https:' && !/^(localhost|127\.0\.0\.1|yourdomain\.com)$/i.test(callback.hostname))
  } catch { /* reported as not public-looking */ }
  return {
    environment: (process.env.MPESA_ENV || 'sandbox').toLowerCase(),
    consumerKeyConfigured: Boolean(process.env.MPESA_CONSUMER_KEY?.trim()),
    consumerSecretConfigured: Boolean(process.env.MPESA_CONSUMER_SECRET?.trim()),
    businessShortCodeConfigured: Boolean((process.env.MPESA_BUSINESS_SHORTCODE || process.env.MPESA_SHORTCODE)?.trim()),
    passkeyConfigured: Boolean(process.env.MPESA_PASSKEY?.trim()),
    callbackUrlConfigured: Boolean(callbackUrl),
    callbackUrlPublicLooking: callbackPublicLooking,
  }
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
  const configuredEnvironment = (process.env.MPESA_ENV || 'sandbox').toLowerCase()
  if (configuredEnvironment !== 'sandbox' && configuredEnvironment !== 'production')
    throw new Error('MPESA_ENV must be either sandbox or production')
  const environment = configuredEnvironment as DarajaEnvironment
  const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim()
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim()
  // The Daraja shortcode belongs to server configuration. It is deliberately
  // independent from the customer-facing branch Buy Goods Till.
  const shortcode = process.env.MPESA_BUSINESS_SHORTCODE?.trim() || process.env.MPESA_SHORTCODE?.trim()
  const passkey = process.env.MPESA_PASSKEY?.trim()
  const explicitCallbackUrl = process.env.MPESA_CALLBACK_URL?.trim()
  const applicationUrl = process.env.BETTER_AUTH_URL?.trim()
  const callbackUrl = explicitCallbackUrl || (applicationUrl && !/localhost|127\.0\.0\.1/i.test(applicationUrl)
    ? new URL('/api/mpesa/callback', applicationUrl).toString()
    : undefined)
  const transactionType = process.env.MPESA_TRANSACTION_TYPE === 'CustomerBuyGoodsOnline' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline'
  if (!configurationDiagnosticLogged) {
    configurationDiagnosticLogged = true
    mpesaLog('CONFIGURATION', mpesaConfigurationDiagnostic())
  }
  if (!consumerKey || !consumerSecret || !shortcode || !callbackUrl || (requirePasskey && !passkey)) {
    throw new Error(requirePasskey
      ? 'M-Pesa STK Push is not fully configured. Add the consumer key, secret, shortcode, passkey and public callback URL.'
      : 'M-Pesa PayBill confirmation is not fully configured. Add the consumer key, secret, shortcode and public callback URL.')
  }
  let callback: URL
  try { callback = new URL(callbackUrl) } catch { throw new Error('MPESA_CALLBACK_URL must be a valid public HTTPS URL') }
  if (callback.protocol !== 'https:' || /^(localhost|127\.0\.0\.1|yourdomain\.com)$/i.test(callback.hostname))
    throw new Error('MPESA_CALLBACK_URL must use the public HTTPS callback domain; placeholder and local URLs are not allowed')
  if (!process.env.MPESA_CALLBACK_SECRET?.trim()) {
    throw new Error('MPESA_CALLBACK_SECRET is required for Daraja callbacks')
  }
  return { environment, consumerKey, consumerSecret, shortcode, passkey, callbackUrl, transactionType }
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

export function callbackAuthenticationToken() {
  const secret = process.env.MPESA_CALLBACK_SECRET?.trim()
  if (!secret) return null
  // Daraja can only return the configured URL. Send a purpose-bound derived
  // bearer token, never the raw server secret itself.
  return createHmac('sha256', secret).update('pesaby:daraja:stk-callback:v1').digest('base64url')
}

function callbackUrl(configuredUrl: string) {
  const token = callbackAuthenticationToken()
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

function c2bCallbackUrl(pathname: string) {
  const config = configuration(false)
  const url = new URL(config.callbackUrl)
  url.pathname = pathname
  url.search = ''
  return callbackUrl(url.toString())
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
      ConfirmationURL: c2bCallbackUrl('/api/mpesa/c2b/confirmation'),
      ValidationURL: c2bCallbackUrl('/api/mpesa/c2b/validation'),
    }),
  })
  const body = await response.json() as { ResponseCode?: string; ResponseDescription?: string; errorMessage?: string }
  if (!response.ok || (body.ResponseCode && body.ResponseCode !== '0')) throw new Error(body.errorMessage || body.ResponseDescription || 'Could not register M-Pesa PayBill callback URLs')
  return body
}

export function validCallbackToken(value: string | null) {
  const expected = callbackAuthenticationToken()
  if (!expected) return false
  if (!value) return false
  const left = createHash('sha256').update(value).digest()
  const right = createHash('sha256').update(expected).digest()
  return timingSafeEqual(left, right)
}
