import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import pg from 'pg'

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (match) process.env[match[1]] ??= match[2].replace(/^"|"$/g, '')
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required. Hardware catalogue tests never run against the application database.')
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const port = process.env.HARDWARE_CATALOGUE_TEST_PORT ?? '3102'
const baseURL = process.env.HARDWARE_CATALOGUE_TEST_BASE_URL ?? `http://127.0.0.1:${port}`
const useExternalServer = Boolean(process.env.HARDWARE_CATALOGUE_TEST_BASE_URL)
process.env.BETTER_AUTH_URL = baseURL
process.env.REQUIRE_EMAIL_VERIFICATION = 'false'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL

const pool = new pg.Pool({
  connectionString: process.env.TEST_DATABASE_URL,
  ssl: process.env.TEST_DATABASE_URL.includes('supabase.com')
    ? { rejectUnauthorized: false }
    : undefined,
})
const server = useExternalServer
  ? null
  : spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', port], {
      env: process.env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
let output = ''
server?.stdout.on('data', (value) => { output += value })
server?.stderr.on('data', (value) => { output += value })

const expectedCategories = [
  'Building Materials',
  'Electrical',
  'Hand Tools',
  'Paints & Finishes',
  'Plumbing',
  'Power Tools',
  'Roofing & Steel',
]
const expectedProducts = [
  ['BLD-CEM-50', 'Cement 50kg', 'Building Materials', '720.00', '850.00', 'bag'],
  ['ELC-TWN-25', 'Twin Cable 2.5mm', 'Electrical', '125.00', '185.00', 'meter'],
  ['HND-HMR-16', 'Claw Hammer 16oz', 'Hand Tools', '320.00', '650.00', 'piece'],
  ['PLM-PVC-12', 'PVC Pipe 1/2 inch', 'Plumbing', '180.00', '350.00', 'meter'],
  ['PNT-WHT-4L', 'White Wall Paint 4L', 'Paints & Finishes', '1100.00', '1800.00', 'tin'],
  ['PWR-DRL-13', 'Electric Drill 13mm', 'Power Tools', '5000.00', '8500.00', 'piece'],
  ['STL-BND-25', 'Binding Wire 25kg', 'Roofing & Steel', '3450.00', '4200.00', 'roll'],
]
const starterSkus = expectedProducts.map(([sku]) => sku)
const stamp = Date.now()
const identities = [
  { email: `hardware-a-${stamp}@example.com`, name: 'Hardware Alpha', category: 'hardware' },
  { email: `hardware-b-${stamp}@example.com`, name: 'Hardware Beta', category: 'hardware' },
  { email: `retail-control-${stamp}@example.com`, name: 'Retail Control', category: 'general_shop' },
]

async function ready() {
  for (let index = 0; index < 80; index++) {
    if (server?.exitCode !== null && server) throw new Error(output)
    try {
      if ((await fetch(baseURL)).status < 500) return
    } catch {}
    await wait(750)
  }
  throw new Error(`Hardware catalogue test server did not start\n${output}`)
}

async function signUp(email) {
  const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { origin: baseURL, 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Hardware Test', email, password: 'Secure-Test-42!' }),
  })
  assert.equal(response.status, 200, await response.text())
  const cookie = response.headers.get('set-cookie')
  assert.ok(cookie?.includes('better-auth'))
  return cookie
}

async function api(cookie, path, body) {
  const response = await fetch(`${baseURL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      origin: baseURL,
      cookie,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { response, data: text ? JSON.parse(text) : null }
}

function onboardingSteps(identity) {
  return [
    ['welcome', { acceptsTerms: true }],
    ['business-details', { businessName: identity.name, displayName: '', country: 'KE', region: 'Nairobi', city: 'Nairobi', phone: '+254700000000', businessEmail: '', website: '', businessSize: 'small', businessDescription: 'Hardware catalogue acceptance test', language: 'en', timezone: 'Africa/Nairobi', currency: 'KES', financialYearStart: '07-01' }],
    ['business-type', { businessFamily: 'retail', businessCategory: identity.category, customBusinessCategory: '' }],
    ['operations', { sellsProducts: true, providesServices: false, tracksInventory: true, hasEmployees: false, multipleLocations: false, keepsCustomers: true, usesSuppliers: true, acceptsCash: true, acceptsMpesa: true, acceptsCard: false, needsTax: false, issuesReceipts: true }],
    ['modules', { enabledModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'expenses', 'reports', 'analytics'] }],
    ['main-branch', { branchName: 'Main Branch', branchPhone: '+254700000000', branchAddress: 'Test Street', branchRegion: 'Nairobi', branchCity: 'Nairobi', branchTimezone: 'Africa/Nairobi', receiptHeader: '' }],
    ['payments-tax', { paymentMethods: ['cash', 'mpesa'], defaultPaymentMethod: 'cash', taxEnabled: false, pricesIncludeTax: false, taxName: 'VAT', taxRate: '16', taxIdentifier: '' }],
    ['receipt', { receiptBusinessName: identity.name, receiptPhone: '+254700000000', receiptAddress: 'Test Street', receiptFooter: 'Thank you.', showTaxOnReceipt: false, receiptShowPhone: true, receiptShowAddress: true, receiptShowCashier: true, receiptShowCustomer: true, receiptShowPayment: true, receiptShowQrCode: false, receiptShowItemSku: false, receiptNumbering: 'automatic' }],
    ['review', {}],
  ]
}

async function completeWorkspace(identity) {
  const cookie = await signUp(identity.email)
  assert.equal((await api(cookie, '/api/auth/post-signup', {})).response.status, 200)
  let revision = (await api(cookie, '/api/onboarding/status')).data.revision
  for (const [stepId, data] of onboardingSteps(identity)) {
    const saved = await api(cookie, '/api/onboarding/save-step', { stepId, data, revision })
    assert.equal(saved.response.status, 200, `${stepId}: ${JSON.stringify(saved.data)}`)
    revision = saved.data.revision
  }
  const completed = await api(cookie, '/api/onboarding/complete', { revision })
  assert.equal(completed.response.status, 200, JSON.stringify(completed.data))
  return { cookie, revision, organizationId: completed.data.organizationId }
}

async function cleanup() {
  for (const identity of identities) {
    const users = await pool.query('select id from "user" where email = $1', [identity.email])
    for (const row of users.rows) {
      const organizations = await pool.query('select id from organization where "userId" = $1', [row.id])
      for (const organization of organizations.rows) {
        await pool.query('delete from inventory_balance where "orgId" = $1', [organization.id])
        await pool.query('delete from product where "orgId" = $1', [organization.id])
        await pool.query('delete from category where "orgId" = $1', [organization.id])
      }
      await pool.query('delete from organization where "userId" = $1', [row.id])
      await pool.query('delete from "user" where id = $1', [row.id])
    }
  }
}

async function catalogueCounts(organizationId) {
  const result = await pool.query(`select
    (select count(*)::int from category where "orgId"=$1) categories,
    (select count(*)::int from product where "orgId"=$1) products,
    (select count(*)::int from inventory_balance where "orgId"=$1) balances,
    (select count(*)::int from audit_event where "organizationId"=$1 and action='hardware_catalogue_initialized') audit_events`, [organizationId])
  return result.rows[0]
}

try {
  await ready()
  await cleanup()
  const hardwareA = await completeWorkspace(identities[0])
  const hardwareB = await completeWorkspace(identities[1])
  const retailControl = await completeWorkspace(identities[2])

  for (const hardware of [hardwareA, hardwareB]) {
    assert.deepEqual(await catalogueCounts(hardware.organizationId), {
      categories: 7,
      products: 7,
      balances: 7,
      audit_events: 1,
    })
    const categories = await pool.query('select name from category where "orgId"=$1 order by name', [hardware.organizationId])
    assert.deepEqual(categories.rows.map((row) => row.name), expectedCategories)
    const products = await pool.query(`select p.sku, p.name, c.name category, p."buyingPrice", p."sellingPrice", p.unit, p.stock
      from product p join category c on c.id=p."categoryId" and c."orgId"=p."orgId"
      where p."orgId"=$1 order by p.sku`, [hardware.organizationId])
    assert.deepEqual(
      products.rows.map((row) => [row.sku, row.name, row.category, row.buyingPrice, row.sellingPrice, row.unit]),
      expectedProducts
    )
    assert.ok(products.rows.every((row) => row.stock === 0), 'starter catalogue stock must be zero')
    const balances = await pool.query('select "onHand", reserved, unavailable, incoming from inventory_balance where "orgId"=$1', [hardware.organizationId])
    assert.ok(balances.rows.every((row) => [row.onHand, row.reserved, row.unavailable, row.incoming].every((value) => Number(value) === 0)))
  }

  const beforeRepeat = await catalogueCounts(hardwareA.organizationId)
  const repeated = await api(hardwareA.cookie, '/api/onboarding/complete', { revision: hardwareA.revision })
  assert.equal(repeated.response.status, 200, 'workspace completion must remain idempotent')
  assert.deepEqual(await catalogueCounts(hardwareA.organizationId), beforeRepeat)

  assert.deepEqual(await catalogueCounts(retailControl.organizationId), {
    categories: 0,
    products: 0,
    balances: 0,
    audit_events: 0,
  })
  const crossTenantRows = await pool.query(`select count(*)::int count from product p
    join category c on c.id=p."categoryId"
    where p."orgId" in ($1, $2) and p."orgId" <> c."orgId"`, [hardwareA.organizationId, hardwareB.organizationId])
  assert.equal(crossTenantRows.rows[0].count, 0)
  const skuIsolation = await pool.query('select "orgId", count(*)::int count from product where sku=any($1) group by "orgId"', [starterSkus])
  assert.equal(skuIsolation.rows.filter((row) => [hardwareA.organizationId, hardwareB.organizationId].includes(row.orgId)).length, 2)
  assert.notEqual(hardwareA.organizationId, hardwareB.organizationId)

  console.log('Hardware catalogue database integration test passed')
} finally {
  await cleanup().catch(() => {})
  await pool.end()
  if (server?.exitCode === null && server.pid) process.kill(-server.pid, 'SIGTERM')
  await wait(500)
  if (server?.exitCode === null && server.pid) process.kill(-server.pid, 'SIGKILL')
}
