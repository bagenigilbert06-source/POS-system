import dotenv from 'dotenv'

dotenv.config()

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim()
if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is required. Database tests never use DATABASE_URL or DIRECT_URL as a fallback.'
  )
}

export const applicationDatabaseUrl = process.env.DATABASE_URL?.trim()
export const applicationDirectUrl = process.env.DIRECT_URL?.trim()
const applicationUrls = [applicationDatabaseUrl, applicationDirectUrl]
  .map((value) => value?.trim())
  .filter(Boolean)

if (applicationUrls.includes(testDatabaseUrl)) {
  throw new Error(
    'TEST_DATABASE_URL must point to a separate disposable database, not the application database.'
  )
}

process.env.DATABASE_URL = testDatabaseUrl
process.env.DIRECT_URL = testDatabaseUrl
process.env.NODE_ENV = 'test'

export { testDatabaseUrl }
export const testDatabaseSsl = testDatabaseUrl.includes('supabase.com')
  ? { rejectUnauthorized: false }
  : undefined
