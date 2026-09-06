import { defineConfig, devices } from '@playwright/test'
import './tests/e2e/test-env'

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3102'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm run build && pnpm exec next start -H 127.0.0.1 -p 3102',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        env: {
          ...process.env,
          DATABASE_URL: process.env.TEST_DATABASE_URL!,
          DIRECT_URL: process.env.TEST_DATABASE_URL!,
          PESABY_PUBLIC_WEBSITE_ENABLED: 'false',
        },
      },
})
