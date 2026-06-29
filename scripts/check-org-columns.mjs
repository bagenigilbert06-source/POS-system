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
      `select column_name from information_schema.columns where table_name = 'organization' order by ordinal_position`
    )
    console.log('organization columns:')
    for (const row of res.rows) console.log('-', row.column_name)
  } catch (err) {
    console.error('error querying columns:', err)
  } finally {
    await pool.end()
  }
}

run()
