import { readFileSync } from 'node:fs'
import pg from 'pg'

function loadEnv() {
  const env = readFileSync('.env', 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    process.env[key] ??= rawValue.replace(/^"|"$/g, '')
  }
}

loadEnv()

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  try {
    const res = await pool.query(
      `update "organization" set "name" = $1, "businessType" = $2, "onboardingCompleted" = $3, "onboardingStep" = $4, "businessEmail" = $5, "country" = $6, "timezone" = $7, "businessSize" = $8, "phone" = $9, "updatedAt" = $10, "businessCategory" = $11 where "organization"."id" = $12 returning *`,
      [
        'mandago min mart',
        'retail',
        true,
        6,
        'bagenigilbert@gmail.com',
        'Kenya',
        'Africa/Nairobi',
        'medium',
        '+254746741719',
        new Date().toISOString(),
        'other_retail',
        'org_placeholder',
      ]
    )
    console.log('rows:', res.rows)
  } catch (err) {
    console.error('sql error:', err)
  } finally {
    await pool.end()
  }
}

run()
