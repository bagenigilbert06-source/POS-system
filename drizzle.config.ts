import * as dotenv from 'dotenv'
import { type Config } from 'drizzle-kit'

dotenv.config()

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL or DIRECT_URL is required to run Drizzle')

const config: Config = {
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
    ssl: databaseUrl.includes('supabase')
      ? { rejectUnauthorized: false }
      : undefined,
  },
}

export default config
