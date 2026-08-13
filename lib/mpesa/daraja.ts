import { createHash, timingSafeEqual } from 'node:crypto'

type DarajaEnvironment = 'sandbox' | 'production'

type StkPushResponse = {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

let accessTokenCache: { token: string; expiresAt: number } | null = null

function configuration(requirePasskey = true) {
  const environment = (process.env.MPESA_ENV || 'sandbox').toLowerCase() as DarajaEnvironment
  const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim()
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim()
  const shortcode = process.env.MPESA_SHORTCODE?.trim()
  const passkey = process.env.MPESA_PASSKEY?.trim()
  const explicitCallbackUrl = process.env.MPESA_CALLBACK_URL?.trim()
  const applicationUrl = process.env.BETTER_AUTH_URL?.trim()
  const callbackUrl = explicitCallbackUrl || (applicationUrl && !/localhost|127\.0\.0\.1/i.test(applicationUrl)
    ? new URL('/api/mpesa/callback', applicationUrl).toString()
    : undefined)
  const transactionType = process.env.MPESA_TRANSACTION_TYPE === 'CustomerBuyGoodsOnline' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline'
  if (!consumerKey || !consumerSecret || !shortcode || !callbackUrl || (requirePasskey && !passkey)) {
    throw new Error(requirePasskey
      ? 'M-Pesa STK Push is not fully configured. Add the consumer key, secret, shortcode, passkey and public callback URL.'
      : 'M-Pesa PayBill confirmation is not fully configured. Add the consumer key, secret, shortcode and public callback URL.')
  }
  if (environment === 'production' && !process.env.MPESA_CALLBACK_SECRET?.trim()) {
    throw new Error('MPESA_CALLBACK_SECRET is required for production callbacks')
  }
  return { environment, consumerKey, consumerSecret, shortcode, passkey, callbackUrl, transactionType }
}

function baseUrl(environment: DarajaEnvironment) {
  return environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'
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
  const response = await fetchWithTimeout(`${baseUrl(config.environment)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
  })
  const body = await response.json() as { access_token?: string; expires_in?: string; errorMessage?: string }
  if (!response.ok || !body.access_token) throw new Error(body.errorMessage || 'Could not authenticate with Safaricom Daraja')
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
  throw new Error('Enter a valid Kenyan M-Pesa number, for example 0712 345 678')
}

function callbackUrl(configuredUrl: string) {
  const secret = process.env.MPESA_CALLBACK_SECRET?.trim()
  if (!secret) return configuredUrl
  const url = new URL(configuredUrl)
  url.searchParams.set('token', secret)
  return url.toString()
}

export async function requestStkPush(input: { phone: string; amount: number; accountReference: string }) {
  const config = configuration()
  const timestamp = darajaTimestamp()
  const password = Buffer.from(`${config.shortcode}${config.passkey!}${timestamp}`).toString('base64')
  const token = await accessToken()
  const response = await fetchWithTimeout(`${baseUrl(config.environment)}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: config.transactionType,
      Amount: input.amount,
      PartyA: input.phone,
      PartyB: config.shortcode,
      PhoneNumber: input.phone,
      CallBackURL: callbackUrl(config.callbackUrl),
      AccountReference: input.accountReference.slice(0, 12),
      TransactionDesc: 'POS purchase',
    }),
  })
  const body = await response.json() as Partial<StkPushResponse> & { errorMessage?: string; errorCode?: string }
  if (!response.ok || body.ResponseCode !== '0' || !body.CheckoutRequestID || !body.MerchantRequestID) {
    throw new Error(body.errorMessage || body.ResponseDescription || 'Safaricom could not start the M-Pesa prompt')
  }
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
  const response = await fetchWithTimeout(`${baseUrl(config.environment)}/mpesa/c2b/v1/registerurl`, {
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
  const expected = process.env.MPESA_CALLBACK_SECRET?.trim()
  if (!expected) return process.env.MPESA_ENV !== 'production'
  if (!value) return false
  const left = createHash('sha256').update(value).digest()
  const right = createHash('sha256').update(expected).digest()
  return timingSafeEqual(left, right)
}
