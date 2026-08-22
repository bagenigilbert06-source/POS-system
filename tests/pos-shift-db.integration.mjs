import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL or DIRECT_URL is required')
const ssl = connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined
const poolFor = () => new pg.Pool({ connectionString, ssl, max: 4 })
const token = randomUUID().replaceAll('-', '')
const ids = {
  owner: `shift-test-owner-${token}`,
  cashierA: `shift-test-a-${token}`,
  cashierB: `shift-test-b-${token}`,
  org: `shift-test-org-${token}`,
  branch: `shift-test-branch-${token}`,
  terminal: `shift-test-terminal-${token}`,
  saleCash: `shift-test-sale-cash-${token}`,
  saleMpesa: `shift-test-sale-mpesa-${token}`,
  returnCash: `shift-test-return-cash-${token}`,
  returnMpesa: `shift-test-return-mpesa-${token}`,
}
const auditId = (name) => `shift-test-audit-${name}-${token}`

async function cleanup(pool) {
  await pool.query('DELETE FROM "mpesa_payment_request" WHERE "organizationId" = $1', [ids.org])
  await pool.query('DELETE FROM "sales_return" WHERE "orgId" = $1', [ids.org])
  await pool.query('DELETE FROM "sale_payment" WHERE "orgId" = $1', [ids.org])
  await pool.query('DELETE FROM "sale" WHERE "orgId" = $1', [ids.org])
  await pool.query('DELETE FROM "cash_movement" WHERE "orgId" = $1', [ids.org])
  await pool.query('DELETE FROM "pos_session" WHERE "orgId" = $1', [ids.org])
  await pool.query('DELETE FROM "audit_event" WHERE "organizationId" = $1', [ids.org])
  await pool.query('DELETE FROM "pos_terminal" WHERE "organizationId" = $1', [ids.org])
  await pool.query('DELETE FROM "branch" WHERE "organizationId" = $1', [ids.org])
  await pool.query('DELETE FROM "organization" WHERE "id" = $1', [ids.org])
  await pool.query('DELETE FROM "user" WHERE "id" = ANY($1)', [[ids.owner, ids.cashierA, ids.cashierB]])
}

let pool = poolFor()
try {
  const migration = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'pos_session' AND column_name IN ('varianceReason','reconciliationStartedAt','closingSummary','terminalId')
  `)
  assert.equal(migration.rowCount, 4, 'reconciliation migration columns are missing')
  const indexes = await pool.query(`SELECT indexname FROM pg_indexes WHERE indexname IN ('pos_session_active_terminal_unique','cash_movement_org_idempotency_idx')`)
  assert.equal(indexes.rowCount, 2, 'reconciliation uniqueness indexes are missing')

  await pool.query('INSERT INTO "user" (id,name,email) VALUES ($1,$2,$3),($4,$5,$6),($7,$8,$9)', [ids.owner, 'Shift test owner', `${token}-owner@example.invalid`, ids.cashierA, 'Shift test cashier A', `${token}-a@example.invalid`, ids.cashierB, 'Shift test cashier B', `${token}-b@example.invalid`])
  await pool.query('INSERT INTO "organization" (id,name,slug,"userId") VALUES ($1,$2,$3,$4)', [ids.org, 'Shift integration test', `shift-test-${token}`, ids.owner])
  await pool.query('INSERT INTO "business_settings" ("organizationId","cashVarianceTolerance") VALUES ($1,50)', [ids.org])
  await pool.query('INSERT INTO "branch" (id,"organizationId",code,name,"isMain") VALUES ($1,$2,$3,$4,true)', [ids.branch, ids.org, 'TEST', 'Integration test location'])
  await pool.query('INSERT INTO "pos_terminal" (id,"organizationId","branchId","tokenHash",name,"registeredBy") VALUES ($1,$2,$3,$4,$5,$6)', [ids.terminal, ids.org, ids.branch, `hash-${token}`, 'Counter 1', ids.owner])

  // Two different users race to open the same physical register. Exactly one wins.
  const sessionA = `shift-test-session-a-${token}`, sessionB = `shift-test-session-b-${token}`
  const opening = (sessionId, userId) => pool.query('INSERT INTO "pos_session" (id,"sessionNo",status,"openingCash","openedBy","orgId","branchId","terminalId","openedAt") VALUES ($1,$2,\'open\',30000,$3,$4,$5,$6,now() - interval \'26 hours\') RETURNING id', [sessionId, `REG-${sessionId.slice(-8)}`, userId, ids.org, ids.branch, ids.terminal])
  const openResults = await Promise.allSettled([opening(sessionA, ids.cashierA), opening(sessionB, ids.cashierB)])
  assert.equal(openResults.filter((result) => result.status === 'fulfilled').length, 1, 'exactly one terminal shift must open')
  assert.equal(openResults.filter((result) => result.status === 'rejected' && result.reason?.code === '23505').length, 1, 'terminal conflict must be a unique violation')
  const active = await pool.query('SELECT * FROM "pos_session" WHERE "orgId"=$1 AND "terminalId"=$2 AND status=\'open\'', [ids.org, ids.terminal])
  assert.equal(active.rowCount, 1)
  const sessionId = active.rows[0].id, cashierId = active.rows[0].openedBy
  await assert.rejects(() => opening(`shift-test-double-${token}`, cashierId), (error) => error.code === '23505', 'double-click Open must not create another shift')
  await pool.query('INSERT INTO "audit_event" (id,"organizationId","userId",action,metadata) VALUES ($1,$2,$3,\'shift.opened\',$4)', [auditId('open'), ids.org, cashierId, { sessionId, terminalId: ids.terminal, openingCash: 30000 }])

  // Commit and reconnect: this is the browser refresh/process restart persistence check.
  await pool.end(); pool = poolFor()
  const resumed = await pool.query('SELECT status,"openingCash","openedAt" FROM "pos_session" WHERE id=$1', [sessionId])
  assert.equal(resumed.rows[0].status, 'open')
  assert.equal(Number(resumed.rows[0].openingCash), 30000)
  assert.ok(new Date(resumed.rows[0].openedAt).getTime() < Date.now() - 24 * 60 * 60 * 1000, 'test shift must cross midnight')

  await pool.query(`INSERT INTO "sale" (id,"receiptNo",subtotal,total,"paymentMethod",status,"userId","orgId","branchId","posSessionId","idempotencyKey") VALUES
    ($1,$2,10000,10000,'cash','completed',$3,$4,$5,$6,$7),
    ($8,$9,7000,7000,'mpesa','completed',$3,$4,$5,$6,$10)`, [ids.saleCash, `CASH-${token}`, cashierId, ids.org, ids.branch, sessionId, `cash-${token}`, ids.saleMpesa, `MPESA-${token}`, `mpesa-${token}`])
  await pool.query(`INSERT INTO "sale_payment" (id,"saleId",method,amount,reference,status,"userId","orgId") VALUES
    ($1,$2,'cash',10000,NULL,'completed',$3,$4),($5,$6,'mpesa',7000,$7,'completed',$3,$4)`, [`pay-cash-${token}`, ids.saleCash, cashierId, ids.org, `pay-mpesa-${token}`, ids.saleMpesa, `MPE${token.slice(0,7)}`])
  await pool.query(`INSERT INTO "cash_movement" (id,"sessionId",type,amount,reason,"userId","orgId","branchId","idempotencyKey") VALUES
    ($1,$2,'cash_in',5000,'Petty cash replenishment',$3,$4,$5,$6),
    ($7,$2,'safe_drop',3000,'Safe transfer',$3,$4,$5,$8)`, [`move-in-${token}`, sessionId, cashierId, ids.org, ids.branch, `move-in-key-${token}`, `move-drop-${token}`, `move-drop-key-${token}`])
  await assert.rejects(() => pool.query('INSERT INTO "cash_movement" (id,"sessionId",type,amount,reason,"userId","orgId","branchId","idempotencyKey") VALUES ($1,$2,\'cash_in\',5000,\'Duplicate\',$3,$4,$5,$6)', [`move-duplicate-${token}`, sessionId, cashierId, ids.org, ids.branch, `move-in-key-${token}`]), (error) => error.code === '23505', 'double-click cash movement must be idempotent')
  await pool.query(`INSERT INTO "sales_return" (id,"returnNo","saleId","receiptNo",amount,"refundMethod",reason,status,"userId","orgId","posSessionId") VALUES
    ($1,$2,$3,$4,2000,'cash','Cash refund','completed',$5,$6,$7),
    ($8,$9,$10,$11,1000,'mpesa','M-Pesa refund','completed',$5,$6,NULL)`, [ids.returnCash, `CN-CASH-${token}`, ids.saleCash, `CASH-${token}`, cashierId, ids.org, sessionId, ids.returnMpesa, `CN-MPESA-${token}`, ids.saleMpesa, `MPESA-${token}`])

  const pendingRequestId = `shift-test-mpesa-pending-${token}`
  await pool.query('INSERT INTO "mpesa_payment_request" (id,"organizationId","userId","branchId","posSessionId","idempotencyKey",phone,amount,status,"expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7,500,\'AWAITING_CUSTOMER\',now()+interval \'5 minutes\')', [pendingRequestId, ids.org, cashierId, ids.branch, sessionId, `pending-${token}`, '254700000000'])
  const pendingGuard = await pool.query('SELECT id FROM "mpesa_payment_request" WHERE "organizationId"=$1 AND "posSessionId"=$2 AND "saleId" IS NULL AND status=ANY($3)', [ids.org, sessionId, ['SENDING_STK', 'AWAITING_CUSTOMER', 'AWAITING_CONFIRMATION', 'CONFIRMED']])
  assert.equal(pendingGuard.rowCount, 1, 'pending M-Pesa must block shift reconciliation')
  await pool.query('UPDATE "mpesa_payment_request" SET status=\'FAILED\' WHERE id=$1', [pendingRequestId])
  assert.equal((await pool.query('SELECT id FROM "mpesa_payment_request" WHERE "organizationId"=$1 AND "posSessionId"=$2 AND "saleId" IS NULL AND status=ANY($3)', [ids.org, sessionId, ['SENDING_STK', 'AWAITING_CUSTOMER', 'AWAITING_CONFIRMATION', 'CONFIRMED']])).rowCount, 0)

  const [begin] = (await pool.query('UPDATE "pos_session" SET status=\'closing\', "reconciliationStartedAt"=now() WHERE id=$1 AND status=\'open\' RETURNING id', [sessionId])).rows
  assert.equal(begin.id, sessionId)
  assert.equal((await pool.query('UPDATE "pos_session" SET status=\'closing\' WHERE id=$1 AND status=\'open\' RETURNING id', [sessionId])).rowCount, 0, 'double-click Close must start only once')
  assert.equal((await pool.query('SELECT id FROM "pos_session" WHERE id=$1 AND status=\'open\' FOR UPDATE', [sessionId])).rowCount, 0, 'sales must fail the active-shift guard while closing')

  // Cancellation is transactional, clears the draft count, and can be started again.
  const cancelled = await pool.query('UPDATE "pos_session" SET status=\'open\',"reconciliationStartedAt"=NULL,"countedCash"=NULL,"countedVariance"=NULL,"countedAt"=NULL WHERE id=$1 AND status=\'closing\' RETURNING id', [sessionId])
  assert.equal(cancelled.rowCount, 1, 'cancel reconciliation must reopen the shift')
  assert.equal((await pool.query('SELECT "countedCash" FROM "pos_session" WHERE id=$1 AND status=\'open\'', [sessionId])).rows[0].countedCash, null)
  await pool.query('INSERT INTO "audit_event" (id,"organizationId","userId",action,metadata) VALUES ($1,$2,$3,\'shift.reconciliation_cancelled\',$4)', [auditId('cancel'), ids.org, cashierId, { sessionId }])
  assert.equal((await pool.query('UPDATE "pos_session" SET status=\'closing\',"reconciliationStartedAt"=now() WHERE id=$1 AND status=\'open\' RETURNING id', [sessionId])).rowCount, 1)
  await pool.query('INSERT INTO "audit_event" (id,"organizationId","userId",action,metadata) VALUES ($1,$2,$3,\'shift.reconciliation_started\',$4)', [auditId('restart'), ids.org, cashierId, { sessionId }])

  const totals = await pool.query(`SELECT
    (SELECT COALESCE(SUM(total),0) FROM sale WHERE "posSessionId"=$1 AND "paymentMethod"='cash' AND status IN ('completed','partially_refunded','refunded')) AS cash_sales,
    (SELECT COALESCE(SUM(amount),0) FROM sales_return WHERE "posSessionId"=$1 AND "refundMethod"='cash' AND status='completed') AS cash_refunds,
    (SELECT COALESCE(SUM(amount),0) FROM cash_movement WHERE "sessionId"=$1 AND type='cash_in') AS cash_in,
    (SELECT COALESCE(SUM(amount),0) FROM cash_movement WHERE "sessionId"=$1 AND type='cash_out') AS cash_out,
    (SELECT COALESCE(SUM(amount),0) FROM cash_movement WHERE "sessionId"=$1 AND type='safe_drop') AS safe_drop`, [sessionId])
  const row = totals.rows[0]
  const expected = 30000 + Number(row.cash_sales) + Number(row.cash_in) - Number(row.cash_refunds) - Number(row.cash_out) - Number(row.safe_drop)
  assert.equal(expected, 40000, 'expected drawer formula is incorrect')

  // Recount and policy boundary checks: zero, short, over, exactly-at-tolerance,
  // and beyond-tolerance reason requirement.
  const countDraft = async (amount) => pool.query('UPDATE "pos_session" SET "countedCash"=$2,"countedVariance"=$3,"countedAt"=now() WHERE id=$1 AND status=\'closing\' RETURNING "countedCash","countedVariance"', [sessionId, amount, amount - expected])
  assert.equal((await countDraft(40000)).rows[0].countedVariance, '0.00', 'zero variance should be balanced')
  assert.equal(Math.abs(Number((await countDraft(39950)).rows[0].countedVariance)) <= 50, true, 'short at tolerance boundary should be allowed')
  assert.equal(Math.abs(Number((await countDraft(40050)).rows[0].countedVariance)) <= 50, true, 'over at tolerance boundary should be allowed')
  assert.equal(Math.abs(Number((await countDraft(39949)).rows[0].countedVariance)) > 50, true, 'short beyond tolerance requires a reason')
  assert.equal(Math.abs(Number((await countDraft(40051)).rows[0].countedVariance)) > 50, true, 'over beyond tolerance requires a reason')
  await countDraft(39950)
  await pool.end(); pool = poolFor()
  const refreshedReconciliation = await pool.query('SELECT status,"countedCash","countedVariance" FROM "pos_session" WHERE id=$1', [sessionId])
  assert.deepEqual(refreshedReconciliation.rows[0], { status: 'closing', countedCash: '39950.00', countedVariance: '-50.00' }, 'refresh must restore the active reconciliation step')

  const counted = 39950, variance = counted - expected
  const summary = { openingFloat: '30000.00', cashSales: '10000.00', cashRefunds: '2000.00', cashIn: '5000.00', cashOut: '0.00', safeDrops: '3000.00', paymentTotals: { cash: '10000.00', mpesa: '7000.00' }, transactionCount: 2 }
  const close = await pool.query('UPDATE "pos_session" SET status=\'closed\',"expectedCash"=$2,"closingCash"=$3,variance=$4,"varianceReason"=$5,"closingSummary"=$6,"closedBy"=$7,"closedAt"=now() WHERE id=$1 AND status=\'closing\' RETURNING id', [sessionId, expected, counted, variance, 'Drawer was KES 50 short', summary, cashierId])
  assert.equal(close.rowCount, 1)
  assert.equal((await pool.query('UPDATE "pos_session" SET status=\'closed\' WHERE id=$1 AND status=\'closing\' RETURNING id', [sessionId])).rowCount, 0, 'double close must not change an already closed shift')
  await pool.query('INSERT INTO "audit_event" (id,"organizationId","userId",action,metadata) VALUES ($1,$2,$3,\'shift.reconciled\',$4)', [auditId('close'), ids.org, cashierId, { sessionId, expectedCash: expected, countedCash: counted, variance, summary }])

  await pool.end(); pool = poolFor()
  const persisted = await pool.query(`SELECT p.status,p."expectedCash",p."closingCash",p.variance,p."varianceReason",p."closingSummary",t.name AS terminal,b.name AS location
    FROM "pos_session" p JOIN "pos_terminal" t ON t.id=p."terminalId" JOIN branch b ON b.id=p."branchId" WHERE p.id=$1`, [sessionId])
  assert.equal(persisted.rowCount, 1)
  assert.deepEqual({ status: persisted.rows[0].status, expected: Number(persisted.rows[0].expectedCash), counted: Number(persisted.rows[0].closingCash), variance: Number(persisted.rows[0].variance), terminal: persisted.rows[0].terminal, location: persisted.rows[0].location }, { status: 'closed', expected: 40000, counted: 39950, variance: -50, terminal: 'Counter 1', location: 'Integration test location' })
  assert.equal(persisted.rows[0].closingSummary.paymentTotals.mpesa, '7000.00')
  assert.equal((await pool.query('SELECT id FROM "pos_session" WHERE id=$1 AND status=\'open\'', [sessionId])).rowCount, 0, 'a stale browser must not see a closed shift as active')
  assert.equal(Number((await pool.query('SELECT COALESCE(SUM(amount),0) total FROM "sales_return" WHERE "posSessionId"=$1 AND "refundMethod"=\'cash\'', [sessionId])).rows[0].total), 2000)
  assert.equal(Number((await pool.query('SELECT COALESCE(SUM(amount),0) total FROM "sales_return" WHERE "posSessionId"=$1 AND "refundMethod"=\'mpesa\'', [sessionId])).rows[0].total), 0, 'M-Pesa refund must not reduce the cash drawer')
  assert.equal((await pool.query('SELECT id FROM "cash_movement" WHERE "sessionId"=$1', [sessionId])).rowCount, 2)
  assert.equal((await pool.query('SELECT id FROM "audit_event" WHERE "organizationId"=$1 AND action IN (\'shift.opened\',\'shift.reconciliation_cancelled\',\'shift.reconciliation_started\',\'shift.reconciled\')', [ids.org])).rowCount, 4)
  console.log(JSON.stringify({ passed: true, scenarios: 21, sessionId, expectedCash: expected, countedCash: counted, variance, persistedAfterReconnect: true, operationsHistoryReadable: true, pendingMpesaGuard: true, reconciliationDraftPersistence: true }, null, 2))
} finally {
  await cleanup(pool)
  const leftovers = await pool.query(`SELECT
    (SELECT count(*) FROM "organization" WHERE id=$1) +
    (SELECT count(*) FROM "pos_session" WHERE "orgId"=$1) +
    (SELECT count(*) FROM "cash_movement" WHERE "orgId"=$1) +
    (SELECT count(*) FROM "sale" WHERE "orgId"=$1) +
    (SELECT count(*) FROM "sales_return" WHERE "orgId"=$1) +
    (SELECT count(*) FROM "audit_event" WHERE "organizationId"=$1) AS count`, [ids.org])
  assert.equal(Number(leftovers.rows[0].count), 0, 'integration test cleanup left synthetic records behind')
  await pool.end()
}
