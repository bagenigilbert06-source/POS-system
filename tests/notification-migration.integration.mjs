import fs from 'node:fs'
import pg from 'pg'
import { testDatabaseSsl, testDatabaseUrl } from './test-database-env.mjs'

const client = new pg.Client({ connectionString: testDatabaseUrl, ssl: testDatabaseSsl })
await client.connect()
try {
  await client.query('begin')
  await client.query(fs.readFileSync('drizzle/0078_notification_foundation.sql', 'utf8'))
  const result = await client.query("select count(*)::int as count from information_schema.tables where table_schema='public' and table_name like 'notification_%'")
  if (result.rows[0].count !== 4) throw new Error(`Expected four notification tables, found ${result.rows[0].count}`)
  await client.query('rollback')
  console.log('Notification migration validates against isolated PostgreSQL and rolls back')
} catch (error) {
  await client.query('rollback')
  throw error
} finally {
  await client.end()
}
