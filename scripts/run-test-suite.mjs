import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import '../tests/test-database-env.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL, DIRECT_URL: process.env.TEST_DATABASE_URL }

function run(args) {
  const result = spawnSync(pnpm, args, { cwd: root, env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// Migrations are always applied to the guarded disposable URL before tests.
run(['exec', 'drizzle-kit', 'migrate'])

for (const script of [
  'test:onboarding-rules',
  'test:rbac',
  'test:staff-routing',
  'test:inventory',
  'test:reports',
  'test:email',
  'test:pos-pin',
  'test:pos-sale',
  'test:barcode-scanner',
  'test:offline-pos',
  'test:held-sales',
  'test:product-packaging',
  'test:product-terminology',
  'test:hardware-catalogue',
  'test:finance',
  'test:mpesa',
  'test:rewards',
  'test:etims',
  'test:pharmacy',
  'test:cafe',
  'test:auth',
  'test:onboarding',
  'test:age-verification',
  'test:pos-shift-db',
  'test:offline-pos-db',
  'test:held-sales-db',
  'test:product-packaging-db',
  'test:pharmacy-db',
  'test:hardware-catalogue-db',
]) run(['run', script])
