import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import pg from 'pg'

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) process.env[match[1]] ??= match[2].replace(/^"|"$/g, '')
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const port = process.env.ONBOARDING_TEST_PORT ?? '3101'
const baseURL = process.env.ONBOARDING_TEST_BASE_URL ?? `http://127.0.0.1:${port}`
const useExternalServer = Boolean(process.env.ONBOARDING_TEST_BASE_URL)
process.env.BETTER_AUTH_URL = baseURL
process.env.REQUIRE_EMAIL_VERIFICATION = 'false'
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required. Onboarding tests never run against the application database.')
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, ssl: process.env.TEST_DATABASE_URL.includes('supabase.com') ? { rejectUnauthorized: false } : undefined })
const server = useExternalServer ? null : spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', port], { env: process.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
server?.stdout.on('data', (value) => { output += value })
server?.stderr.on('data', (value) => { output += value })

async function ready() {
  for (let index = 0; index < 60; index++) {
    if (server?.exitCode !== null && server) throw new Error(output)
    try { if ((await fetch(baseURL)).status < 500) return } catch {}
    await wait(750)
  }
  throw new Error('Onboarding test server did not start')
}

async function signUp(email) {
  const response = await fetch(`${baseURL}/api/auth/sign-up/email`, { method: 'POST', headers: { origin: baseURL, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Onboarding Test', email, password: 'Secure-Test-42!' }) })
  assert.equal(response.status, 200, await response.text())
  const cookie = response.headers.get('set-cookie')
  assert.ok(cookie?.includes('better-auth'))
  return cookie
}

async function api(cookie, path, body) {
  const response = await fetch(`${baseURL}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { origin: baseURL, cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await response.text()
  return { response, data: text ? JSON.parse(text) : null }
}

const steps = [
  ['welcome', {}],
  ['business-details', { businessName: 'Test Traders', displayName: '', country: 'KE', region: 'Nairobi', city: 'Nairobi', phone: '+254700000000', businessEmail: '', website: '', language: 'en', timezone: 'Africa/Nairobi', currency: 'KES', financialYearStart: '01-01' }],
  ['business-type', { businessFamily: 'retail', businessCategory: 'general_shop', customBusinessCategory: '' }],
  ['operations', { sellsProducts: true, providesServices: false, tracksInventory: true, hasEmployees: false, multipleLocations: false, keepsCustomers: true, usesSuppliers: true, acceptsCash: true, acceptsMpesa: true, acceptsCard: false, needsTax: false, issuesReceipts: true }],
  ['modules', { enabledModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'reports', 'analytics'] }],
  ['main-branch', { branchName: 'Main Branch', branchPhone: '+254700000000', branchAddress: 'Test Street', branchRegion: 'Nairobi', branchCity: 'Nairobi', branchTimezone: 'Africa/Nairobi', receiptHeader: '' }],
  ['payments-tax', { paymentMethods: ['cash', 'mpesa'], defaultPaymentMethod: 'cash', taxEnabled: false, pricesIncludeTax: false, taxName: 'VAT', taxRate: '16', taxIdentifier: '' }],
  ['receipt', { receiptBusinessName: 'Test Traders', receiptPhone: '+254700000000', receiptAddress: 'Test Street', receiptFooter: 'Thank you.', showTaxOnReceipt: false, receiptNumbering: 'automatic' }],
  ['review', {}],
]

const emails = [`onboarding-a-${Date.now()}@example.com`, `onboarding-b-${Date.now()}@example.com`]

async function cleanup() {
  for (const email of emails) {
    const user = await pool.query('select id from "user" where email = $1', [email])
    if (user.rows[0]) {
      await pool.query('delete from organization where "userId" = $1', [user.rows[0].id])
      await pool.query('delete from "user" where id = $1', [user.rows[0].id])
    }
  }
}

try {
  await ready(); await cleanup()
  const cookieA = await signUp(emails[0])
  const cookieB = await signUp(emails[1])
  assert.equal((await api(cookieA, '/api/auth/post-signup', {})).response.status, 200)
  assert.equal((await api(cookieA, '/api/auth/post-signup', {})).response.status, 200, 'draft initialization must be idempotent')
  const statusB = await api(cookieB, '/api/onboarding/status')
  const skipped = await api(cookieB, '/api/onboarding/save-step', { stepId: 'business-details', data: steps[1][1], revision: statusB.data.revision })
  assert.equal(skipped.response.status, 409, 'steps cannot be skipped')
  const incomplete = await api(cookieB, '/api/onboarding/complete', { revision: statusB.data.revision })
  assert.equal(incomplete.response.status, 422, 'client cannot fake completion')

  let revision = (await api(cookieA, '/api/onboarding/status')).data.revision
  for (const [stepId, data] of steps) {
    const saved = await api(cookieA, '/api/onboarding/save-step', { stepId, data, revision })
    assert.equal(saved.response.status, 200, `${stepId}: ${JSON.stringify(saved.data)}`)
    revision = saved.data.revision
  }
  const stale = await api(cookieA, '/api/onboarding/save-step', { stepId: 'review', data: {}, revision: revision - 1 })
  assert.equal(stale.response.status, 409, 'stale tabs must not overwrite newer onboarding progress')
  const status = await api(cookieA, '/api/onboarding/status')
  assert.equal(status.data.currentStep, 'review')
  const completed = await api(cookieA, '/api/onboarding/complete', { revision, organizationId: 'untrusted-client-id' })
  assert.equal(completed.response.status, 200, JSON.stringify(completed.data))
  const repeated = await api(cookieA, '/api/onboarding/complete', { revision })
  assert.equal(repeated.response.status, 200, 'completion must be idempotent')

  const dashboard = await fetch(`${baseURL}/dashboard`, { headers: { cookie: cookieA }, redirect: 'manual' })
  const dashboardHtml = await dashboard.text()
  assert.equal(dashboard.status, 200, `completed workspace dashboard should render: ${dashboardHtml.slice(0, 500)}`)
  assert.match(dashboardHtml, /Sales and expenses/, 'dashboard should render the operating overview')

  const reports = await fetch(`${baseURL}/dashboard/reports`, { headers: { cookie: cookieA }, redirect: 'manual' })
  const reportsHtml = await reports.text()
  assert.equal(reports.status, 200, `tenant report should render: ${reportsHtml.slice(0, 500)}`)
  assert.doesNotMatch(reportsHtml, /Unable to load this workspace/, 'reports must not fall through to the dashboard error boundary')

  const user = await pool.query('select id from "user" where email = $1', [emails[0]])
  const userId = user.rows[0].id
  const counts = await pool.query(`select
    (select count(*)::int from organization where "userId"=$1) organizations,
    (select count(*)::int from branch b join organization o on o.id=b."organizationId" where o."userId"=$1 and b."isMain") branches,
    (select count(*)::int from organization_membership m join organization o on o.id=m."organizationId" where o."userId"=$1 and m."userId"=$1 and m.role='owner') memberships,
    (select count(*)::int from branch_membership bm join branch b on b.id=bm."branchId" join organization o on o.id=b."organizationId" where o."userId"=$1 and bm."userId"=$1 and bm.role='owner') branch_memberships,
    (select count(*)::int from business_settings bs join organization o on o.id=bs."organizationId" where o."userId"=$1) settings,
    (select count(*)::int from workspace w join organization o on o.id=w."organizationId" where o."userId"=$1) workspaces,
    (select count(*)::int from audit_event a join organization o on o.id=a."organizationId" where o."userId"=$1 and a.action='workspace.created') audit_events`, [userId])
  assert.deepEqual(counts.rows[0], { organizations: 1, branches: 1, memberships: 1, branch_memberships: 1, settings: 1, workspaces: 1, audit_events: 1 })
  console.log('Onboarding integration test passed')
} finally {
  await cleanup().catch(() => {}); await pool.end()
  if (server?.exitCode === null && server.pid) process.kill(-server.pid, 'SIGTERM')
  await wait(500)
  if (server?.exitCode === null && server.pid) process.kill(-server.pid, 'SIGKILL')
}
