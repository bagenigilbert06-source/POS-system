import dotenv from 'dotenv'

dotenv.config()

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for Playwright. E2E never uses the application database.')
}

const applicationDatabaseUrl = process.env.E2E_APPLICATION_DATABASE_URL ?? process.env.DATABASE_URL
const applicationDirectUrl = process.env.E2E_APPLICATION_DIRECT_URL ?? process.env.DIRECT_URL
const applicationUrls = [applicationDatabaseUrl, applicationDirectUrl]
  .map((value) => value?.trim())
  .filter(Boolean)
if (applicationUrls.includes(testDatabaseUrl)) {
  throw new Error('TEST_DATABASE_URL must be a separate disposable database.')
}

if (!process.env.E2E_APPLICATION_DATABASE_URL && applicationDatabaseUrl) {
  process.env.E2E_APPLICATION_DATABASE_URL = applicationDatabaseUrl
}
if (!process.env.E2E_APPLICATION_DIRECT_URL && applicationDirectUrl) {
  process.env.E2E_APPLICATION_DIRECT_URL = applicationDirectUrl
}
process.env.DATABASE_URL = testDatabaseUrl
process.env.DIRECT_URL = testDatabaseUrl

export { testDatabaseUrl }
export const testDatabaseSsl = testDatabaseUrl.includes('supabase.com')
  ? { rejectUnauthorized: false }
  : undefined
