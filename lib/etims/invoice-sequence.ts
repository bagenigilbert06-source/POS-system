import { sql } from 'drizzle-orm'
import { db } from '../db'

export type FiscalSequenceScope = { organizationId: string; branchId: string; provider: string; environment: string }
type SqlExecutor = Pick<typeof db, 'execute'>

/** Atomic PostgreSQL UPSERT: the returned value is allocated once and the row
 * already contains the next value before another transaction can proceed. */
export async function allocateEtimsInvoiceNumber(executor: SqlExecutor, scope: FiscalSequenceScope) {
  const result = await executor.execute(sql`
    INSERT INTO etims_invoice_sequence ("organizationId", "branchId", provider, environment, "nextNumber", "updatedAt")
    VALUES (${scope.organizationId}, ${scope.branchId}, ${scope.provider}, ${scope.environment}, 2, now())
    ON CONFLICT ("organizationId", "branchId", provider, environment)
    DO UPDATE SET "nextNumber" = etims_invoice_sequence."nextNumber" + 1, "updatedAt" = now()
    RETURNING "nextNumber" - 1 AS "allocatedNumber"
  `)
  const value = Number(result.rows[0]?.allocatedNumber)
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('Unable to allocate fiscal invoice number')
  return value
}
