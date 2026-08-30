import 'dotenv/config'

const required = ['GAVACONNECT_CONSUMER_KEY', 'GAVACONNECT_CONSUMER_SECRET']
for (const name of required) {
  if (!process.env[name]?.trim()) {
    console.error(`GAVACONNECT AUTHENTICATION: FAIL (${name} is not configured)`)
    process.exitCode = 1
    process.exit()
  }
}

const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 10000)
try {
  const basic = Buffer.from(`${process.env.GAVACONNECT_CONSUMER_KEY.trim()}:${process.env.GAVACONNECT_CONSUMER_SECRET.trim()}`).toString('base64')
  const response = await fetch('https://sbx.kra.go.ke/v1/token/generate?grant_type=client_credentials', {
    method: 'GET',
    headers: { Authorization: `Basic ${basic}`, Accept: 'application/json' },
    signal: controller.signal,
  })
  const body = await response.json().catch(() => null)
  const valid = body && typeof body.access_token === 'string' && body.access_token.length > 0
  if (!response.ok || !valid) {
    console.error(`GAVACONNECT AUTHENTICATION: FAIL (HTTP ${response.status})`)
    process.exitCode = 1
  } else {
    console.log(`GAVACONNECT AUTHENTICATION: PASS (HTTP ${response.status}; access token received)`)
  }
} catch (error) {
  console.error(`GAVACONNECT AUTHENTICATION: FAIL (${error?.name === 'AbortError' ? 'timeout' : 'sandbox request unavailable'})`)
  process.exitCode = 1
} finally {
  clearTimeout(timer)
}

const missingInitialization = ['GAVACONNECT_APIGEE_APP_ID', 'sandbox taxpayer PIN', 'sandbox bhfId', 'stable Pesaby dvcSrlNo']
  .filter((name) => name.startsWith('GAVACONNECT_') ? !process.env[name]?.trim() : true)
console.log(`INITIALIZATION NOT RUN. Missing or unverified: ${missingInitialization.join(', ')}`)
