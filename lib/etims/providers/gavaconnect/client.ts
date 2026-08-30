import { EtimsTemporaryError, EtimsValidationError } from '../../types'

const TOKEN_URL = 'https://sbx.kra.go.ke/v1/token/generate?grant_type=client_credentials'
const BASE_URL = 'https://sbx.kra.go.ke/etims-oscu/api/v1'

function credentials() {
  const key = process.env.GAVACONNECT_CONSUMER_KEY
  const secret = process.env.GAVACONNECT_CONSUMER_SECRET
  if (!key || !secret) throw new EtimsValidationError('GavaConnect sandbox credentials are not configured', 'GAVACONNECT_NOT_CONFIGURED')
  return { key, secret }
}

export async function requestAccessToken(timeoutMs = 10_000): Promise<string> {
  const { key, secret } = credentials()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(TOKEN_URL, { method: 'GET', headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` }, signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new EtimsTemporaryError('GavaConnect authentication was rejected', `GAVACONNECT_AUTH_${response.status}`)
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || typeof (body as { access_token?: unknown }).access_token !== 'string' || !(body as { access_token: string }).access_token) throw new EtimsValidationError('GavaConnect returned an invalid authentication response', 'GAVACONNECT_MALFORMED_TOKEN')
    return (body as { access_token: string }).access_token
  } catch (error) {
    if (error instanceof EtimsValidationError || error instanceof EtimsTemporaryError) throw error
    throw new EtimsTemporaryError('GavaConnect authentication could not be completed', 'GAVACONNECT_AUTH_UNAVAILABLE')
  } finally { clearTimeout(timer) }
}

export async function oscurequest<T>(path: string, input: { tin: string; bhfId: string; cmcKey: string; apigeeAppId: string; body: unknown }, timeoutMs = 10_000): Promise<T> {
  if (!input.tin) throw new EtimsValidationError('Taxpayer PIN is required', 'BUSINESS_PIN_MISSING')
  if (!input.bhfId) throw new EtimsValidationError('eTIMS branch is required', 'BRANCH_REQUIRED')
  if (!input.cmcKey) throw new EtimsValidationError('OSCU communication key is required before runtime requests', 'INITIALIZATION_REQUIRED')
  const token = await requestAccessToken(timeoutMs)
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${BASE_URL}/${path.replace(/^\//, '')}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', tin: input.tin, bhfId: input.bhfId, cmcKey: input.cmcKey, apigee_app_id: input.apigeeAppId }, body: JSON.stringify(input.body), signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new EtimsTemporaryError('GavaConnect OSCU request was rejected', `GAVACONNECT_OSCU_${response.status}`)
    return await response.json() as T
  } catch (error) { if (error instanceof EtimsValidationError || error instanceof EtimsTemporaryError) throw error; throw new EtimsTemporaryError('GavaConnect OSCU request failed', 'GAVACONNECT_OSCU_UNAVAILABLE') } finally { clearTimeout(timer) }
}

export async function initializeDevice(input: { tin: string; bhfId: string; deviceSerial: string }, timeoutMs = 10_000): Promise<unknown> {
  const appId = process.env.GAVACONNECT_APIGEE_APP_ID
  if (!appId) throw new EtimsValidationError('GavaConnect Apigee application ID is not configured', 'APP_ID_REQUIRED')
  if (!input.tin) throw new EtimsValidationError('Taxpayer PIN is required', 'BUSINESS_PIN_MISSING')
  if (!input.bhfId) throw new EtimsValidationError('eTIMS branch is required', 'BRANCH_REQUIRED')
  if (!input.deviceSerial) throw new EtimsValidationError('Device serial is required', 'DEVICE_REQUIRED')
  const token = await requestAccessToken(timeoutMs)
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${BASE_URL}/initialize`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apigee_app_id: appId }, body: JSON.stringify({ tin: input.tin, bhfId: input.bhfId, dvcSrlNo: input.deviceSerial }), signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new EtimsTemporaryError('GavaConnect initialization was rejected', `GAVACONNECT_INITIALIZE_${response.status}`)
    return await response.json()
  } catch (error) { if (error instanceof EtimsValidationError || error instanceof EtimsTemporaryError) throw error; throw new EtimsTemporaryError('GavaConnect initialization failed', 'GAVACONNECT_INITIALIZE_UNAVAILABLE') } finally { clearTimeout(timer) }
}
