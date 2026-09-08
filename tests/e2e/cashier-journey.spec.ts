import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import pg from 'pg'
import { testDatabaseSsl, testDatabaseUrl } from './test-env'

test.describe.configure({ mode: 'serial' })

const run = randomUUID().replaceAll('-', '')
const ids = {
  owner: `e2e-owner-${run}`,
  mary: `e2e-mary-${run}`,
  jane: `e2e-jane-${run}`,
  org: `e2e-org-${run}`,
  branch: `e2e-branch-${run}`,
  product: `e2e-product-${run}`,
}
const ownerEmail = `e2e-owner-${run}@example.invalid`
const ownerPassword = 'Safe-E2E-Owner-42!'
const maryPin = '284613'
const janePin = '739052'
const pool = new pg.Pool({ connectionString: testDatabaseUrl, ssl: testDatabaseSsl, max: 4 })

async function seedWorkspace() {
  const [ownerHash, maryHash, janeHash] = await Promise.all([
    hashPassword(ownerPassword), hashPassword(maryPin), hashPassword(janePin),
  ])
  await pool.query('BEGIN')
  try {
    await pool.query(`INSERT INTO "user" (id,name,email,"emailVerified") VALUES ($1,'E2E Owner',$2,true),($3,'Mary Cashier',$4,true),($5,'Jane Cashier',$6,true)`, [ids.owner, ownerEmail, ids.mary, `e2e-mary-${run}@example.invalid`, ids.jane, `e2e-jane-${run}@example.invalid`])
    await pool.query(`INSERT INTO account (id,"accountId","providerId","userId",password) VALUES ($1,$2,'credential',$2,$3)`, [`e2e-account-${run}`, ids.owner, ownerHash])
    await pool.query(`INSERT INTO organization (id,name,slug,"businessType","businessCategory","userId","onboardingCompleted",timezone) VALUES ($1,'E2E Shop',$2,'retail','general_shop',$3,true,'Africa/Nairobi')`, [ids.org, `e2e-${run}`, ids.owner])
    await pool.query(`INSERT INTO organization_membership (id,"organizationId","userId",role) VALUES ($1,$2,$3,'owner'),($4,$2,$5,'cashier'),($6,$2,$7,'cashier')`, [`e2e-owner-member-${run}`, ids.org, ids.owner, `e2e-mary-member-${run}`, ids.mary, `e2e-jane-member-${run}`, ids.jane])
    await pool.query(`INSERT INTO branch (id,"organizationId",code,name,"isMain") VALUES ($1,$2,'E2E','E2E Main Branch',true)`, [ids.branch, ids.org])
    await pool.query(`INSERT INTO branch_membership (id,"branchId","userId",role) VALUES ($1,$2,$3,'owner'),($4,$2,$5,'cashier'),($6,$2,$7,'cashier')`, [`e2e-owner-branch-${run}`, ids.branch, ids.owner, `e2e-mary-branch-${run}`, ids.mary, `e2e-jane-branch-${run}`, ids.jane])
    await pool.query(`INSERT INTO employee (id,"userId",name,email,role,status,"orgId") VALUES ($1,$2,'E2E Owner',$3,'owner','active',$4),($5,$6,'Mary Cashier',$7,'cashier','active',$4),($8,$9,'Jane Cashier',$10,'cashier','active',$4)`, [`e2e-owner-employee-${run}`, ids.owner, ownerEmail, ids.org, `e2e-mary-employee-${run}`, ids.mary, `e2e-mary-${run}@example.invalid`, `e2e-jane-employee-${run}`, ids.jane, `e2e-jane-${run}@example.invalid`])
    await pool.query(`INSERT INTO workspace (id,"organizationId",config) VALUES ($1,$2,$3)`, [`e2e-workspace-${run}`, ids.org, { templateId: 'retail-general_shop', enabledModules: ['pos', 'sales', 'products', 'inventory', 'customers', 'operations', 'reports', 'analytics'], businessFamily: 'retail', businessCategory: 'general_shop' }])
    await pool.query(`INSERT INTO business_settings ("organizationId","displayName","paymentMethods","defaultPaymentMethod","taxEnabled","taxRate","receiptBusinessName") VALUES ($1,'E2E Shop',$2,'cash',false,0,'E2E Shop')`, [ids.org, ['cash']])
    await pool.query(`INSERT INTO pos_pin_credential ("userId","pinHash",enabled) VALUES ($1,$2,true),($3,$4,true)`, [ids.mary, maryHash, ids.jane, janeHash])
    await pool.query(`INSERT INTO product (id,name,sku,"sellingPrice",stock,"minStock",unit,"userId","orgId","isActive") VALUES ($1,'E2E Test Item','E2E-ITEM',100,20,2,'pcs',$2,$3,true)`, [ids.product, ids.owner, ids.org])
    await pool.query(`INSERT INTO inventory_balance (id,"productId","branchId","onHand",reserved,unavailable,incoming,"orgId") VALUES ($1,$2,$3,20,0,0,0,$4)`, [`e2e-balance-${run}`, ids.product, ids.branch, ids.org])
    await pool.query('COMMIT')
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  }
}

async function passwordLogin(page: Page) {
  await page.goto('/sign-in')
  await page.getByLabel('Work email').fill(ownerEmail)
  await page.getByRole('textbox', { name: 'Password' }).fill(ownerPassword)
  await page.getByRole('button', { name: 'Sign in to Pesaby' }).click()
  await page.waitForURL(/\/dashboard/)
}

async function pinLogin(page: Page, pin: string) {
  await page.goto('/sign-in?pos=1')
  await page.getByLabel('POS PIN').fill(pin)
}

async function terminalOnlyContext(source: BrowserContext, browser: Browser) {
  const terminal = (await source.cookies()).filter((cookie) => cookie.name === 'pesaby_pos_terminal')
  const context = await browser.newContext()
  await context.addCookies(terminal)
  return context
}

async function expectInViewport(locator: Locator, height: number) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  expect(box, 'primary action has a layout box').not.toBeNull()
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(height)
  await locator.click({ trial: true })
}

test.beforeAll(seedWorkspace)
test.afterAll(async () => { await pool.end() })

test('cashier journey, unresolved-shift blocks, stale-session protection and Mary to Jane handoff', async ({ page, context, browser }) => {
  await passwordLogin(page)
  await page.goto('/dashboard/pos')
  await page.getByRole('button', { name: /register this device/i }).click()
  await page.getByPlaceholder('e.g. Terminal 1').fill('E2E Terminal 1')
  await page.getByRole('button', { name: 'Register device' }).click()
  await expect(page.getByRole('button', { name: /register this device/i })).toBeHidden()

  // Dashboard authentication can see the catalogue but cannot open a cashier
  // shift or complete payment without POS PIN authorization.
  await page.getByRole('button', { name: /add e2e test item to basket/i }).click()
  await expect(page.getByRole('button', { name: 'Start shift to take payment' })).toBeDisabled()

  await pinLogin(page, maryPin)
  await page.waitForURL(/\/dashboard\/pos/)
  await expect(page.getByText('Mary Cashier').first()).toBeVisible()
  await page.getByRole('button', { name: 'Open register' }).click()
  await page.getByRole('dialog').locator('input').first().fill('100')
  await page.getByRole('button', { name: 'Open register' }).last().click()
  await expect(page.getByText(/Open.*E2E Terminal 1/)).toBeVisible()

  const posViewports = [
    { width: 1024, height: 650 },
    { width: 1024, height: 700 },
    { width: 1024, height: 720 },
    { width: 1024, height: 768 },
    { width: 1280, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]
  for (const viewport of posViewports) {
    await page.setViewportSize(viewport)
    await page.goto('/dashboard/pos')
    await page.getByRole('button', { name: /add e2e test item to basket/i }).click()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Continue to checkout' }).click()
    await page.getByRole('button', { name: /continue to payment/i }).click()
    await expectInViewport(page.getByRole('button', { name: /complete cash sale/i }), viewport.height)
    await page.getByRole('button', { name: 'Back' }).click()
    await page.getByRole('button', { name: /back to basket/i }).click()
    await page.getByRole('button', { name: /remove e2e test item from basket/i }).click()
  }
  await page.setViewportSize({ width: 1280, height: 800 })

  const openBlock = await terminalOnlyContext(context, browser)
  const openBlockPage = await openBlock.newPage()
  await pinLogin(openBlockPage, janePin)
  await expect(openBlockPage.getByRole('alert')).toBeVisible()
  await openBlock.close()

  await page.getByRole('button', { name: /add e2e test item to basket/i }).click()
  await page.getByRole('button', { name: 'Continue to checkout' }).click()
  await page.getByRole('button', { name: /continue to payment/i }).click()
  await page.locator('#cash-received').fill('100')
  await page.getByRole('button', { name: /complete sale/i }).click()
  await expect(page.getByText('Sale completed')).toBeVisible()
  await page.getByRole('button', { name: /back to pos/i }).click()

  const staleContext = await browser.newContext()
  await staleContext.addCookies(await context.cookies())
  const stalePage = await staleContext.newPage()
  await stalePage.goto('/dashboard/pos')
  await expect(stalePage.getByText('Mary Cashier').first()).toBeVisible()

  await page.getByRole('button', { name: 'End shift' }).click()
  await expect(page.getByRole('heading', { name: 'Count the drawer' })).toBeVisible()

  const closingBlock = await terminalOnlyContext(context, browser)
  const closingBlockPage = await closingBlock.newPage()
  await pinLogin(closingBlockPage, janePin)
  await expect(closingBlockPage.getByRole('alert')).toBeVisible()
  await closingBlock.close()

  await page.getByRole('dialog').locator('input[inputmode="decimal"]').fill('200')
  await page.getByRole('button', { name: 'Continue to reconciliation' }).click()
  await expect(page.getByText('Expected cash')).toBeVisible()
  await page.getByRole('button', { name: 'Close shift' }).click()
  await page.waitForURL(/\/sign-in\?pos=1/)

  await stalePage.reload()
  await expect(stalePage).toHaveURL(/\/sign-in/)
  await staleContext.close()

  await page.getByLabel('POS PIN').fill(janePin)
  await page.waitForURL(/\/dashboard\/pos/)
  await expect(page.getByText('Jane Cashier').first()).toBeVisible()
  await page.getByRole('button', { name: 'Open register' }).click()
  await page.getByRole('dialog').locator('input').first().fill('0')
  await page.getByRole('button', { name: 'Open register' }).last().click()
  await expect(page.getByText(/Open.*E2E Terminal 1/)).toBeVisible()
})

test('manager can recover and close Jane shift', async ({ page }) => {
  await passwordLogin(page)
  await page.goto('/dashboard/operations')
  await page.getByRole('button', { name: 'Recover shift' }).click()
  await expect(page.getByRole('heading', { name: 'Manager shift recovery' })).toBeVisible()
  await page.getByRole('button', { name: 'Start reconciliation' }).click()
  await page.getByLabel('Physical drawer cash').fill('0')
  await page.getByRole('button', { name: 'Submit blind count' }).click()
  await page.getByRole('button', { name: 'Close reconciled shift' }).click()
  await expect(page.getByText('Shift reconciled and terminal released')).toBeVisible()
})
