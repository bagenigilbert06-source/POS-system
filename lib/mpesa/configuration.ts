export type MpesaEnvironment = 'sandbox' | 'production'

export class MpesaConfigurationError extends Error {
  readonly code = 'MPESA_CONFIGURATION_ERROR'
  constructor(message = 'M-Pesa is not available because its server configuration is incomplete.') {
    super(message)
    this.name = 'MpesaConfigurationError'
  }
}

function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new MpesaConfigurationError()
  return value
}

function publicHttpsUrl(value: string) {
  let url: URL
  try { url = new URL(value) } catch { throw new MpesaConfigurationError() }
  if (url.protocol !== 'https:' || /^(localhost|127\.0\.0\.1|yourdomain\.com)$/i.test(url.hostname))
    throw new MpesaConfigurationError()
  return url.toString()
}

/** The single authoritative, server-only Daraja configuration boundary. */
export function loadMpesaConfiguration(options: { requirePasskey?: boolean; requireTill?: boolean; liveTransaction?: boolean } = {}) {
  const rawEnvironment = (process.env.MPESA_ENV || 'sandbox').trim().toLowerCase()
  if (rawEnvironment !== 'sandbox' && rawEnvironment !== 'production') throw new MpesaConfigurationError()
  const environment = rawEnvironment as MpesaEnvironment
  const shortcode = required('MPESA_SHORTCODE')
  const tillNumber = process.env.MPESA_TILL_NUMBER?.trim() || null
  if (options.requireTill && !tillNumber) throw new MpesaConfigurationError()
  const passkey = process.env.MPESA_PASSKEY?.trim() || null
  if (options.requirePasskey !== false && !passkey) throw new MpesaConfigurationError()
  const callbackUrl = publicHttpsUrl(required('MPESA_CALLBACK_URL'))
  const productionEnabled = process.env.MPESA_PRODUCTION_ENABLED?.trim().toLowerCase() === 'true'
  if (environment === 'production' && options.liveTransaction && !productionEnabled)
    throw new MpesaConfigurationError('Live M-Pesa transactions are disabled by the production safety gate.')

  return {
    environment,
    consumerKey: required('MPESA_CONSUMER_KEY'),
    consumerSecret: required('MPESA_CONSUMER_SECRET'),
    shortcode,
    tillNumber,
    passkey,
    callbackUrl,
    callbackSecret: required('MPESA_CALLBACK_SECRET'),
    productionEnabled,
    transactionType: process.env.MPESA_TRANSACTION_TYPE === 'CustomerBuyGoodsOnline'
      ? 'CustomerBuyGoodsOnline' as const : 'CustomerPayBillOnline' as const,
  }
}

export function mpesaConfigurationStatus() {
  const environment = (process.env.MPESA_ENV || 'sandbox').trim().toLowerCase()
  const callback = process.env.MPESA_CALLBACK_URL?.trim()
  let callbackPublicLooking = false
  try { callbackPublicLooking = Boolean(callback && publicHttpsUrl(callback)) } catch { /* status only */ }
  return {
    environment,
    consumerKeyConfigured: Boolean(process.env.MPESA_CONSUMER_KEY?.trim()),
    consumerSecretConfigured: Boolean(process.env.MPESA_CONSUMER_SECRET?.trim()),
    shortcodeConfigured: Boolean(process.env.MPESA_SHORTCODE?.trim()),
    tillConfigured: Boolean(process.env.MPESA_TILL_NUMBER?.trim()),
    passkeyConfigured: Boolean(process.env.MPESA_PASSKEY?.trim()),
    callbackUrlConfigured: Boolean(callback), callbackUrlPublicLooking: callbackPublicLooking,
    callbackSecretConfigured: Boolean(process.env.MPESA_CALLBACK_SECRET?.trim()),
    productionEnabled: process.env.MPESA_PRODUCTION_ENABLED?.trim().toLowerCase() === 'true',
  }
}
