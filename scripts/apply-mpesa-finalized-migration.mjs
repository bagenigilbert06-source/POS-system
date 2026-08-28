import 'dotenv/config'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_URL is required')

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
})

try {
  await pool.query(
    'ALTER TABLE "mpesa_payment_request" ADD COLUMN IF NOT EXISTS "finalizedAt" timestamp'
  )
  await pool.query(`
    ALTER TABLE "mpesa_incoming_payment"
      ADD COLUMN IF NOT EXISTS "matchedAt" timestamp,
      ADD COLUMN IF NOT EXISTS "matchedBy" text
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "mpesa_incoming_payment_match_lookup_idx"
      ON "mpesa_incoming_payment" ("organizationId", "branchId", "shortcode", "phone", "createdAt")
  `)
  const result = await pool.query(
    `select column_name, data_type, is_nullable
       from information_schema.columns
      where table_schema = 'public'
        and ((table_name = 'mpesa_payment_request' and column_name = 'finalizedAt')
          or (table_name = 'mpesa_incoming_payment' and column_name in ('matchedAt', 'matchedBy')))
      order by table_name, column_name`
  )
  if (result.rowCount !== 3) throw new Error('M-Pesa finalization columns were not created')
  console.log('Verified M-Pesa finalization and matching columns')
} finally {
  await pool.end()
}
