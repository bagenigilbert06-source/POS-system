import { readFileSync } from 'node:fs'
import { db } from '../lib/db'
import { organization } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

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

async function run() {
  try {
    const result = await db
      .update(organization)
      .set({
        name: 'mandago min mart',
        businessType: 'retail',
        businessEmail: 'bagenigilbert@gmail.com',
        phone: '+254746741719',
        country: 'Kenya',
        timezone: 'Africa/Nairobi',
        businessSize: 'medium',
        onboardingCompleted: true,
        onboardingStep: 6,
        updatedAt: new Date(),
        businessCategory: 'other_retail',
      })
      .where(eq(organization.id, 'org_placeholder'))
      .returning()

    console.log('result:', result)
  } catch (err) {
    console.error('update error:', err)
  } finally {
    process.exit()
  }
}

run()
