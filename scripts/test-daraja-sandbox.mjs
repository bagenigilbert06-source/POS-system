import 'dotenv/config'

const required = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE']
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`${key} is required`)
}
if ((process.env.MPESA_ENV || 'sandbox').toLowerCase() !== 'sandbox') {
  throw new Error('Refusing to run: MPESA_ENV must be sandbox')
}

const baseUrl = 'https://sandbox.safaricom.co.ke'
const credentials = Buffer.from(`${process.env.MPESA_CONSUMER_KEY.trim()}:${process.env.MPESA_CONSUMER_SECRET.trim()}`).toString('base64')
const authResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
  headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
})
const authBody = await authResponse.json()
if (!authResponse.ok || !authBody.access_token) throw new Error(authBody.errorMessage || 'Daraja sandbox authentication failed')
console.log('PASS Daraja sandbox OAuth')

const token = authBody.access_token
const reference = `POS-TEST-${Date.now().toString().slice(-6)}`
const simulateResponse = await fetch(`${baseUrl}/mpesa/c2b/v1/simulate`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({
    ShortCode: process.env.MPESA_SHORTCODE.trim(),
    CommandID: (process.env.MPESA_C2B_TYPE || 'paybill').toLowerCase() === 'till' ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
    Amount: 1,
    Msisdn: '254708374149',
    BillRefNumber: reference,
  }),
})
const simulateBody = await simulateResponse.json()
if (!simulateResponse.ok || simulateBody.ResponseCode !== '0') {
  const message = simulateBody.errorMessage || simulateBody.ResponseDescription || `Daraja C2B simulation failed (${simulateResponse.status})`
  console.error(`FAIL Daraja C2B sandbox simulation: ${message}`)
  console.error('Authorize the Customer to Business API for this sandbox app in the Daraja portal, then rerun this script.')
  process.exitCode = 1
} else {
  console.log(`PASS Daraja C2B sandbox simulation (${reference})`)
}
