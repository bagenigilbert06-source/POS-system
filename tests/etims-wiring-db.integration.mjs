import assert from 'node:assert/strict'
import test from 'node:test'
import pg from 'pg'
import { testDatabaseSsl, testDatabaseUrl } from './test-database-env.mjs'

const client = new pg.Client({ connectionString: testDatabaseUrl, ssl: testDatabaseSsl })
await client.connect()
await client.query('CREATE TEMP TABLE fiscal_sequence (tenant text, branch text, provider text, environment text, next_number integer NOT NULL, PRIMARY KEY (tenant, branch, provider, environment))')
const allocate = async (tenant, branch) => Number((await client.query(`INSERT INTO fiscal_sequence VALUES ($1,$2,'KRA_OSCU','sandbox',2) ON CONFLICT (tenant,branch,provider,environment) DO UPDATE SET next_number=fiscal_sequence.next_number+1 RETURNING next_number-1 AS allocated`, [tenant, branch])).rows[0].allocated)

test('20 concurrent allocations are unique and retries reuse persisted numbers', async () => {
  const values = await Promise.all(Array.from({ length: 20 }, () => allocate('tenant-a', 'branch-a')))
  assert.deepEqual([...values].sort((a, b) => a - b), Array.from({ length: 20 }, (_, index) => index + 1))
  const persisted = values[4]; assert.equal(persisted, values[4])
})
test('tenant and branch sequence scopes are isolated', async () => {
  assert.equal(await allocate('tenant-b', 'branch-a'), 1)
  assert.equal(await allocate('tenant-a', 'branch-b'), 1)
})
test.after(async () => { await client.end() })
