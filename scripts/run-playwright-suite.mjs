import { spawnSync } from 'node:child_process'
import {
  applicationDatabaseUrl,
  applicationDirectUrl,
} from '../tests/test-database-env.mjs'

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const migrationEnv = {
  ...process.env,
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  DIRECT_URL: process.env.TEST_DATABASE_URL,
}

let result = spawnSync(pnpm, ['exec', 'drizzle-kit', 'migrate'], {
  env: migrationEnv,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

// Do not leak the migration override into Playwright's safety check. Its config
// independently verifies TEST_DATABASE_URL against the application URLs.
const playwrightEnv = { ...process.env }
if (applicationDatabaseUrl) playwrightEnv.DATABASE_URL = applicationDatabaseUrl
else delete playwrightEnv.DATABASE_URL
if (applicationDirectUrl) playwrightEnv.DIRECT_URL = applicationDirectUrl
else delete playwrightEnv.DIRECT_URL

result = spawnSync(
  pnpm,
  ['exec', 'playwright', 'test', ...process.argv.slice(2)],
  { env: playwrightEnv, stdio: 'inherit', shell: process.platform === 'win32' }
)
if (result.error) throw result.error
process.exit(result.status ?? 1)
