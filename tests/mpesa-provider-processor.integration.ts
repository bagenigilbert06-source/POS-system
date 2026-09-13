import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()
const testUrl = process.env.TEST_DATABASE_URL?.trim()
if (!testUrl || testUrl === process.env.DATABASE_URL?.trim()) throw new Error('A separate TEST_DATABASE_URL is required')
process.env.DATABASE_URL = testUrl
process.env.DIRECT_URL = testUrl

async function main() {
  const { processDueMpesaProviderEvents, claimNextMpesaProviderEvent, processMpesaProviderEvent } = await import('../lib/mpesa/provider-event-processor')
  const { ingestSafaricomC2bConfirmation } = await import('../lib/mpesa/c2b-ingestion')
  const token = randomUUID().replaceAll('-', '')
  const id = (name: string) => `mpesa-e2e-${name}-${token}`
  const pool = new pg.Pool({ connectionString: testUrl, max: 8 })
  const org = id('org'), owner = id('user'), branch = id('branch'), session = id('session'), product = id('product')
  const account = id('account'), merchant = id('merchant'), intent = id('intent'), receipt = `M${token.slice(0, 9)}`.toUpperCase()
  try {
    await pool.query('INSERT INTO "user" (id,name,email) VALUES ($1,$2,$3)', [owner, 'M-Pesa E2E', `${token}@example.invalid`])
    await pool.query('INSERT INTO "organization" (id,name,slug,"userId") VALUES ($1,$2,$3,$4)', [org, 'M-Pesa E2E', `mpesa-${token}`, owner])
    await pool.query('INSERT INTO "business_settings" ("organizationId","receiptAutoPrint") VALUES ($1,true)', [org])
    await pool.query('INSERT INTO "branch" (id,"organizationId",code,name,"isMain") VALUES ($1,$2,$3,$4,true)', [branch, org, token.slice(0, 8), 'E2E Branch'])
    await pool.query('INSERT INTO "pos_session" (id,"sessionNo",status,"openedBy","orgId","branchId") VALUES ($1,$2,\'open\',$3,$4,$5)', [session, `S-${token.slice(0, 8)}`, owner, org, branch])
    await pool.query('INSERT INTO product (id,name,"sellingPrice",stock,"userId","orgId") VALUES ($1,$2,100,10,$3,$4)', [product, 'Test product', owner, org])
    await pool.query('INSERT INTO inventory_balance (id,"productId","branchId","onHand","orgId") VALUES ($1,$2,$3,10,$4)', [id('balance'), product, branch, org])
    await pool.query('INSERT INTO mpesa_merchant_configuration (id,"organizationId","branchId","businessName","tillNumber","businessShortCode",environment,"stkEnabled","manualTillEnabled") VALUES ($1,$2,$3,$4,$5,$6,\'sandbox\',true,true)', [merchant, org, branch, 'Test merchant', `T-${token.slice(0, 6)}`, `API-${token.slice(0, 6)}`])
    await pool.query('INSERT INTO mpesa_business_account (id,"organizationId","branchId",shortcode,"accountType") VALUES ($1,$2,$3,$4,\'till\')', [account, org, branch, `API-${token.slice(0, 6)}`])
    await pool.query('INSERT INTO etims_configuration (id,"organizationId","branchId",enabled,environment,"providerName","invoiceSubmissionEnabled") VALUES ($1,$2,$3,true,\'sandbox\',\'mock\',true)', [id('etims-config'), org, branch])
    await pool.query(`INSERT INTO mpesa_payment_request (id,"organizationId","userId","branchId","posSessionId","checkoutPayload","idempotencyKey","paymentMode",phone,amount,status,"expiresAt") VALUES ($1,$2,$3,$4,$5,$6,$7,'till',$8,100,'AWAITING_CONFIRMATION',now()+interval '10 minutes')`, [intent, org, owner, branch, session, { items: [{ productId: product, quantity: 1 }], discountAmount: 0, ageVerified: false }, id('checkout'), '254712345678'])
    const callbackPayload = { TransID: receipt, TransAmount: 100, BusinessShortCode: `API-${token.slice(0, 6)}`, MSISDN: '0712345678' }
    const ingested = await ingestSafaricomC2bConfirmation(callbackPayload)
    assert.ok(ingested.eventId)
    const duplicates = await Promise.all(Array.from({ length: 8 }, () => ingestSafaricomC2bConfirmation(callbackPayload)))
    assert.equal(duplicates.every((result) => result.duplicate), true)

    const results = await processDueMpesaProviderEvents(1)
    assert.equal(results[0]?.status, 'PROCESSED')
    const proof = await pool.query(`SELECT
      (SELECT count(*) FROM sale WHERE "orgId"=$1 AND "mpesaRef"=$2) sales,
      (SELECT count(*) FROM sale_payment WHERE "orgId"=$1 AND reference=$2) payments,
      (SELECT count(*) FROM stock_movement WHERE "orgId"=$1 AND "referenceType"='sale') movements,
      (SELECT count(*) FROM etims_submission WHERE "organizationId"=$1) etims,
      (SELECT "onHand" FROM inventory_balance WHERE "productId"=$3 AND "branchId"=$4) stock`, [org, receipt, product, branch])
    assert.deepEqual({ sales: Number(proof.rows[0].sales), payments: Number(proof.rows[0].payments), movements: Number(proof.rows[0].movements), etims: Number(proof.rows[0].etims), stock: Number(proof.rows[0].stock) }, { sales: 1, payments: 1, movements: 1, etims: 1, stock: 9 })
    assert.equal((await processMpesaProviderEvent(ingested.eventId!)).status, 'ALREADY_PROCESSED')
    assert.equal(Number((await pool.query('SELECT count(*) count FROM sale WHERE "orgId"=$1', [org])).rows[0].count), 1)

    // Two workers cannot own one event; a stale lease is recoverable.
    const stale = id('stale')
    await pool.query(`INSERT INTO mpesa_incoming_payment (id,"transactionId",shortcode,amount,status,"processingStatus","processingStartedAt","reconciliationStatus",payload) VALUES ($1,$2,$3,50,'UNMATCHED','PROCESSING',now()-interval '6 minutes','PENDING','{}')`, [stale, `S${token.slice(0, 9)}`, `API-${token.slice(0, 6)}`])
    const claims = await Promise.all([claimNextMpesaProviderEvent(), claimNextMpesaProviderEvent()])
    assert.equal(claims.filter((row) => row?.id === stale).length, 1)
    console.log('M-Pesa route/service PostgreSQL finalization and recovery integration passed')
  } finally {
    await pool.query('DELETE FROM mpesa_incoming_payment WHERE "organizationId"=$1 OR id LIKE $2', [org, `mpesa-e2e-%-${token}`]).catch(() => {})
    await pool.query('DELETE FROM mpesa_business_account WHERE "organizationId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM mpesa_payment_request WHERE "organizationId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM etims_submission WHERE "organizationId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM etims_invoice_sequence WHERE "organizationId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM etims_configuration WHERE "organizationId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM sale_payment WHERE "orgId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM stock_movement WHERE "orgId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM sale_item WHERE "orgId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM sale WHERE "orgId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM inventory_balance WHERE "orgId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM product WHERE "orgId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM pos_session WHERE "orgId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM mpesa_merchant_configuration WHERE "organizationId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM business_settings WHERE "organizationId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM branch WHERE "organizationId"=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM organization WHERE id=$1', [org]).catch(() => {})
    await pool.query('DELETE FROM "user" WHERE id=$1', [owner]).catch(() => {})
    await pool.end()
  }
}

void main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1) })
