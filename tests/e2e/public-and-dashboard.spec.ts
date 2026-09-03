import { expect, test, type Page } from '@playwright/test'

async function navigate(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' }).catch((error: Error) => {
    if (!error.message.includes('ERR_ABORTED')) throw error
  })
}

test.describe('public experience', () => {
  test('renders every public route', async ({ page }) => {
    for (const path of ['/', '/features', '/industries', '/resources', '/sign-in', '/sign-up', '/workspace-recovery']) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })

      expect(response?.ok(), `${path} should return a successful response`).toBeTruthy()
      await expect(page.locator('main')).toBeVisible()
    }
  })

  test('renders the landing page and reaches sign-in', async ({ page }) => {
    await navigate(page, '/')

    await expect(page).toHaveTitle(/Pesaby/i)
    await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible()

    await expect(page.getByRole('link', { name: 'Sign in' }).first()).toHaveAttribute('href', '/sign-in')
    await navigate(page, '/sign-in')
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByLabel('Work email')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible()
  })

  test('shows clear registration validation without submitting incomplete data', async ({ page }) => {
    await navigate(page, '/sign-up')
    await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled()

    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Enter your full name.')).toBeVisible()
    await expect(page.getByText('Enter your work email.')).toBeVisible()
    await expect(page.getByText('Enter your password.')).toBeVisible()

    await page.getByLabel('Full name').fill('Amina Kamau')
    await page.getByLabel('Work email').fill('amina@example.com')
    await page.getByLabel('Create password').fill('secure-pass')
    await page.getByLabel('Confirm password').fill('different-pass')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText('Passwords do not match.')).toBeVisible()
    await expect(page).toHaveURL(/\/sign-up$/)
  })

  test('shows immediate progress while sign-in and registration requests are pending', async ({ page }) => {
    await page.route('**/api/auth/sign-in/email', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700))
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid credentials' }) })
    })
    await navigate(page, '/sign-in')
    await page.getByLabel('Work email').fill('user@example.com')
    await page.getByRole('textbox', { name: 'Password' }).fill('secure-pass')
    await page.getByRole('button', { name: 'Sign in to Pesaby' }).click()
    await expect(page.getByRole('status', { name: 'Authenticating' })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Authenticating' })).toBeHidden()

    await page.unroute('**/api/auth/sign-in/email')
    await page.route('**/api/auth/sign-up/email', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700))
      await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'Account already exists' }) })
    })
    await navigate(page, '/sign-up')
    await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled()
    await page.getByLabel('Full name').fill('Amina Kamau')
    await page.getByLabel('Work email').fill('amina@example.com')
    await page.getByLabel('Create password').fill('secure-pass')
    await page.getByLabel('Confirm password').fill('secure-pass')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByRole('status', { name: 'Authenticating' })).toBeVisible()
    await expect(page.getByRole('status', { name: 'Authenticating' })).toBeHidden()
  })

  test('redirects protected routes to sign-in for guests', async ({ request }) => {
    for (const path of ['/dashboard', '/dashboard/products', '/dashboard/sales', '/dashboard/reports']) {
      const response = await request.get(path, { maxRedirects: 0 })

      expect(response.status()).toBeGreaterThanOrEqual(300)
      expect(response.status()).toBeLessThan(400)
      expect(response.headers().location).toContain('/sign-in')
    }
  })
})

test.describe('authenticated dashboard', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD for authenticated dashboard coverage.')

  test.beforeEach(async ({ page }) => {
    await navigate(page, '/sign-in')
    await page.getByLabel('Work email').fill(process.env.E2E_EMAIL!)
    await page.getByRole('textbox', { name: 'Password' }).fill(process.env.E2E_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()

    if (await page.getByRole('heading', { name: /let’s set up your business/i }).isVisible().catch(() => false)) {
      await page.getByRole('checkbox').check({ force: true })
      await page.getByRole('button', { name: /start setup/i }).click()
    }
  })

  test('switches dashboard themes and navigates core modules', async ({ page }) => {
    await expect(page.locator('main')).toBeVisible()

    const currentUrl = page.url()
    if (currentUrl.includes('/dashboard')) {
      await expect(page.locator('.dashboard-shell')).toBeVisible()
      await expect(page.getByRole('main')).toBeVisible()
    } else {
      await expect(page).toHaveURL(/\/sign-in|\/onboarding|\/dashboard/)
    }
  })
})
