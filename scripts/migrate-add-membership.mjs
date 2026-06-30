#!/usr/bin/env node

/**
 * Migration script to add organization_membership and workspace tables
 * Run: node scripts/migrate-add-membership.mjs
 */

import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.com')
    ? { rejectUnauthorized: false }
    : undefined,
})

const migrations = [
  // Drop existing constraints if they exist
  `ALTER TABLE "organization" DROP CONSTRAINT IF EXISTS "organization_userId_fkey";`,

  // Add CASCADE delete to organization.userId (fixes org when user is deleted)
  `ALTER TABLE "organization" ADD CONSTRAINT "organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;`,

  // Create organization_membership table
  `CREATE TABLE IF NOT EXISTS "organization_membership" (
    "id" text PRIMARY KEY,
    "organizationId" text NOT NULL,
    "userId" text NOT NULL,
    "role" text NOT NULL DEFAULT 'member',
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
    UNIQUE("organizationId", "userId")
  );`,

  // Create workspace table
  `CREATE TABLE IF NOT EXISTS "workspace" (
    "id" text PRIMARY KEY,
    "organizationId" text NOT NULL UNIQUE,
    "config" jsonb NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now(),
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE
  );`,

  // Create indexes for better query performance
  `CREATE INDEX IF NOT EXISTS "organization_membership_organizationId_idx" ON "organization_membership"("organizationId");`,
  `CREATE INDEX IF NOT EXISTS "organization_membership_userId_idx" ON "organization_membership"("userId");`,
  `CREATE INDEX IF NOT EXISTS "workspace_organizationId_idx" ON "workspace"("organizationId");`,
]

async function runMigrations() {
  const client = await pool.connect()

  try {
    console.log('[v0] Starting database migrations...')
    
    for (const sql of migrations) {
      try {
        console.log(`[v0] Running migration: ${sql.substring(0, 60)}...`)
        await client.query(sql)
        console.log('[v0] ✓ Migration completed')
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('[v0] ⓘ Migration skipped (already exists)')
        } else {
          throw err
        }
      }
    }

    console.log('[v0] ✓ All migrations completed successfully')
  } catch (err) {
    console.error('[v0] ✗ Migration failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations()
