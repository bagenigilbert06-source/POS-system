import pg from 'pg'

const EXPECTED_ORG = '1b31bf22-6d59-4b7d-8aeb-f7e07caece5e'
const EXPECTED_BRANCH = '3a90f89b-aad8-4748-82f1-e27897b875a0'
const CONFIRMATION = 'RESET-R-T-LIQUEUR-DAY-1'
const SYLVIA_EMPLOYEE = '06iHGwkbPa7sfeng0pQu9'
const SYLVIA_USER = 'UXRbdk5J6FMdzyrIJauovipFO2w3xmdk'
const REMOVED_EMPLOYEES = ['3X0ncXevL8gE3pP0dMCwh', '5kNtxud9w8E15LpMuBrEF']
const REMOVED_USERS = [
  'YQd3FYjMj1j1VJXoHPWmXfTWjm3LWFLZ', // Joe Marwa
  'GFKiv4gqn8PnHoxsmP9wo', // john doe
  'M8MkPbDzsFcNzhSr9vu779wYPbeU1vWG', // Sylvia Amachulang
]

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=')
  return [key, rest.join('=') || true]
}))
const execute = args.has('--execute')
if (args.get('--tenant') !== EXPECTED_ORG || args.get('--branch') !== EXPECTED_BRANCH) {
  throw new Error('Exact --tenant and --branch safeguards are required')
}
if (execute && args.get('--confirm') !== CONFIRMATION) {
  throw new Error(`Execution requires --confirm=${CONFIRMATION}`)
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL must be configured')
const pool = new pg.Pool({ connectionString, max: 1, application_name: 'liquor-day-1-reset', ssl: connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : undefined })

const expectedBefore = {
  sale: 25, sale_item: 30, sale_payment: 25, age_verification: 25,
  mpesa_payment_request: 11, customer: 1, reward_ledger: 2,
  customer_reward_account: 1, feedback_invitation: 23, customer_feedback: 5,
  stock_intake: 6, stock_intake_item: 6, stock_movement: 36,
  inventory_cost_layer: 6, inventory_balance: 3, pos_session: 22,
  pos_auth_session: 32, staff_attendance: 5, audit_event: 385,
  product: 765, category: 40,
}

const countSql = {
  sale: 'SELECT count(*)::int n FROM sale WHERE "orgId"=$1',
  sale_item: 'SELECT count(*)::int n FROM sale_item WHERE "orgId"=$1',
  sale_payment: 'SELECT count(*)::int n FROM sale_payment WHERE "orgId"=$1',
  age_verification: 'SELECT count(*)::int n FROM age_verification WHERE "organizationId"=$1',
  mpesa_payment_request: 'SELECT count(*)::int n FROM mpesa_payment_request WHERE "organizationId"=$1',
  customer: 'SELECT count(*)::int n FROM customer WHERE "orgId"=$1',
  reward_ledger: 'SELECT count(*)::int n FROM reward_ledger WHERE "organizationId"=$1',
  customer_reward_account: 'SELECT count(*)::int n FROM customer_reward_account WHERE "organizationId"=$1',
  feedback_invitation: 'SELECT count(*)::int n FROM feedback_invitation WHERE "organizationId"=$1',
  customer_feedback: 'SELECT count(*)::int n FROM customer_feedback WHERE "organizationId"=$1',
  stock_intake: 'SELECT count(*)::int n FROM stock_intake WHERE "orgId"=$1',
  stock_intake_item: 'SELECT count(*)::int n FROM stock_intake_item WHERE "orgId"=$1',
  stock_movement: 'SELECT count(*)::int n FROM stock_movement WHERE "orgId"=$1',
  inventory_cost_layer: 'SELECT count(*)::int n FROM inventory_cost_layer WHERE "orgId"=$1',
  inventory_balance: 'SELECT count(*)::int n FROM inventory_balance WHERE "orgId"=$1',
  pos_session: 'SELECT count(*)::int n FROM pos_session WHERE "orgId"=$1',
  pos_auth_session: 'SELECT count(*)::int n FROM pos_auth_session WHERE "organizationId"=$1',
  staff_attendance: 'SELECT count(*)::int n FROM staff_attendance WHERE "organizationId"=$1',
  audit_event: 'SELECT count(*)::int n FROM audit_event WHERE "organizationId"=$1',
  product: 'SELECT count(*)::int n FROM product WHERE "orgId"=$1',
  category: 'SELECT count(*)::int n FROM category WHERE "orgId"=$1',
}

const deletes = [
  ['customer_feedback', 'DELETE FROM customer_feedback WHERE "organizationId"=$1'],
  ['feedback_invitation', 'DELETE FROM feedback_invitation WHERE "organizationId"=$1'],
  ['age_verification', 'DELETE FROM age_verification WHERE "organizationId"=$1 AND "branchId"=$2'],
  ['etims_submission_attempt', 'DELETE FROM etims_submission_attempt WHERE "organizationId"=$1'],
  ['etims_credit_note', 'DELETE FROM etims_credit_note WHERE "organizationId"=$1'],
  ['etims_submission', 'DELETE FROM etims_submission WHERE "organizationId"=$1'],
  ['restricted_item_audit', 'DELETE FROM restricted_item_audit WHERE "organizationId"=$1'],
  ['sale_item_lot_allocation', 'DELETE FROM sale_item_lot_allocation x WHERE EXISTS (SELECT 1 FROM sale s WHERE s.id=x."saleId" AND s."orgId"=$1)'],
  ['pharmacy_sale_record', 'DELETE FROM pharmacy_sale_record WHERE "organizationId"=$1'],
  ['offline_sale_sync', 'DELETE FROM offline_sale_sync WHERE "organizationId"=$1'],
  ['reward_reservation', 'DELETE FROM reward_reservation WHERE "organizationId"=$1'],
  ['bonus_grant', 'DELETE FROM bonus_grant WHERE "organizationId"=$1'],
  ['reward_ledger', 'DELETE FROM reward_ledger WHERE "organizationId"=$1'],
  ['customer_reward_account', 'DELETE FROM customer_reward_account WHERE "organizationId"=$1'],
  ['card_payment_attempt', 'DELETE FROM card_payment_attempt WHERE "organizationId"=$1'],
  ['mpesa_manual_recovery_audit', 'DELETE FROM mpesa_manual_recovery_audit x WHERE EXISTS (SELECT 1 FROM mpesa_payment_request m WHERE m.id=x."paymentRequestId" AND m."organizationId"=$1)'],
  ['mpesa_incoming_payment', 'DELETE FROM mpesa_incoming_payment WHERE "organizationId"=$1'],
  ['mpesa_payment_request', 'DELETE FROM mpesa_payment_request WHERE "organizationId"=$1 AND "branchId"=$2'],
  ['sales_return_item', 'DELETE FROM sales_return_item x WHERE EXISTS (SELECT 1 FROM sales_return r WHERE r.id=x."returnId" AND r."orgId"=$1)'],
  ['pharmacy_return_disposition', 'DELETE FROM pharmacy_return_disposition WHERE "organizationId"=$1'],
  ['sales_return', 'DELETE FROM sales_return WHERE "orgId"=$1'],
  ['credit_payment', 'DELETE FROM credit_payment WHERE "orgId"=$1'],
  ['credit_sale', 'DELETE FROM credit_sale WHERE "orgId"=$1'],
  ['sale_payment', 'DELETE FROM sale_payment WHERE "orgId"=$1'],
  ['sale_item', 'DELETE FROM sale_item WHERE "orgId"=$1'],
  ['sale', 'DELETE FROM sale WHERE "orgId"=$1 AND "branchId"=$2'],
  ['customer_credit_limit', 'DELETE FROM customer_credit_limit WHERE "orgId"=$1'],
  ['customer', 'DELETE FROM customer WHERE "orgId"=$1'],
  ['inventory_transfer_lot_allocation', 'DELETE FROM inventory_transfer_lot_allocation WHERE "organizationId"=$1'],
  ['inventory_transfer_item', 'DELETE FROM inventory_transfer_item x WHERE EXISTS (SELECT 1 FROM inventory_transfer t WHERE t.id=x."transferId" AND t."orgId"=$1)'],
  ['inventory_transfer', 'DELETE FROM inventory_transfer WHERE "orgId"=$1'],
  ['stock_adjustment_item', 'DELETE FROM stock_adjustment_item x WHERE EXISTS (SELECT 1 FROM stock_adjustment a WHERE a.id=x."adjustmentId" AND a."orgId"=$1)'],
  ['stock_adjustment', 'DELETE FROM stock_adjustment WHERE "orgId"=$1'],
  ['inventory_loss', 'DELETE FROM inventory_loss WHERE "orgId"=$1'],
  ['inventory_serial', 'DELETE FROM inventory_serial WHERE "orgId"=$1 AND "branchId"=$2'],
  ['inventory_lot', 'DELETE FROM inventory_lot WHERE "orgId"=$1 AND "branchId"=$2'],
  ['inventory_cost_layer', 'DELETE FROM inventory_cost_layer WHERE "orgId"=$1 AND "branchId"=$2'],
  ['stock_movement', 'DELETE FROM stock_movement WHERE "orgId"=$1 AND "branchId"=$2'],
  ['inventory_balance', 'DELETE FROM inventory_balance WHERE "orgId"=$1 AND "branchId"=$2'],
  ['stock_intake_item', 'DELETE FROM stock_intake_item WHERE "orgId"=$1'],
  ['stock_intake', 'DELETE FROM stock_intake WHERE "orgId"=$1 AND "branchId"=$2'],
  ['suspended_sale', 'DELETE FROM suspended_sale WHERE "organizationId"=$1'],
  ['cash_movement', 'DELETE FROM cash_movement x WHERE EXISTS (SELECT 1 FROM pos_session p WHERE p.id=x."sessionId" AND p."orgId"=$1)'],
  ['cashier_shift', 'DELETE FROM cashier_shift WHERE "orgId"=$1'],
  ['pos_auth_session', 'DELETE FROM pos_auth_session WHERE "organizationId"=$1 AND "branchId"=$2'],
  ['pos_session', 'DELETE FROM pos_session WHERE "orgId"=$1 AND "branchId"=$2'],
  ['staff_attendance_break', 'DELETE FROM staff_attendance_break x WHERE EXISTS (SELECT 1 FROM staff_attendance a WHERE a.id=x."attendanceId" AND a."organizationId"=$1)'],
  ['staff_attendance_audit', 'DELETE FROM staff_attendance_audit WHERE "organizationId"=$1'],
  ['attendance_correction_request', 'DELETE FROM attendance_correction_request WHERE "organizationId"=$1'],
  ['staff_attendance', 'DELETE FROM staff_attendance WHERE "organizationId"=$1 AND "branchId"=$2'],
  ['employee_commission', 'DELETE FROM employee_commission WHERE "orgId"=$1'],
  ['performance_goal', 'DELETE FROM performance_goal WHERE "orgId"=$1'],
  ['shift_assignment', 'DELETE FROM shift_assignment WHERE "orgId"=$1'],
  ['staff_invitation', 'DELETE FROM staff_invitation WHERE "organizationId"=$1'],
  ['pos_pin_credential', 'DELETE FROM pos_pin_credential WHERE "userId"=ANY($3::text[])'],
  ['branch_membership', 'DELETE FROM branch_membership WHERE "branchId"=$2 AND "userId"=ANY($3::text[])'],
  ['organization_membership', 'DELETE FROM organization_membership WHERE "organizationId"=$1 AND "userId"=ANY($3::text[])'],
  ['employee', 'DELETE FROM employee WHERE "orgId"=$1 AND (id=ANY($4::text[]) OR "userId"=ANY($3::text[]))'],
]

async function counts(client) {
  const result = {}
  for (const [name, sql] of Object.entries(countSql)) result[name] = (await client.query(sql, [EXPECTED_ORG])).rows[0].n
  return result
}

async function assertions(client, auditCount) {
  const invariant = await client.query(`SELECT
    (SELECT count(*) FROM organization WHERE id=$1 AND lower(name)=lower('R T LIQUEUR BARRELS CO. LIMITED'))::int organization,
    (SELECT count(*) FROM branch WHERE id=$2 AND "organizationId"=$1)::int branch,
    (SELECT count(*) FROM product WHERE "orgId"=$1)::int products,
    (SELECT count(*) FROM category WHERE "orgId"=$1)::int categories,
    (SELECT count(*) FROM employee WHERE id=$3 AND "userId"=$4 AND "orgId"=$1 AND status='active' AND role='store_manager')::int sylvia,
    (SELECT count(*) FROM organization_membership WHERE "organizationId"=$1 AND "userId"=$4 AND role='store_manager')::int sylvia_org,
    (SELECT count(*) FROM branch_membership WHERE "branchId"=$2 AND "userId"=$4 AND role='store_manager')::int sylvia_branch,
    (SELECT count(*) FROM organization_membership WHERE "organizationId"=$1 AND role='owner')::int owners,
    (SELECT count(*) FROM audit_event WHERE "organizationId"=$1)::int audit,
    (SELECT count(*) FROM product WHERE "orgId"=$1 AND stock<>0)::int nonzero_stock,
    (SELECT count(*) FROM organization_membership WHERE "organizationId"=$1 AND "userId"=ANY($5::text[]))::int removed_org_access,
    (SELECT count(*) FROM branch_membership WHERE "branchId"=$2 AND "userId"=ANY($5::text[]))::int removed_branch_access
  `, [EXPECTED_ORG, EXPECTED_BRANCH, SYLVIA_EMPLOYEE, SYLVIA_USER, REMOVED_USERS])
  const v = invariant.rows[0]
  const expected = { organization: 1, branch: 1, products: 765, categories: 40, sylvia: 1, sylvia_org: 1, sylvia_branch: 1, nonzero_stock: 0, removed_org_access: 0, removed_branch_access: 0 }
  for (const [key, value] of Object.entries(expected)) if (v[key] !== value) throw new Error(`Invariant ${key}: expected ${value}, got ${v[key]}`)
  if (v.owners < 1) throw new Error('Owner membership would not remain')
  if (v.audit !== auditCount) throw new Error(`Audit history changed: ${auditCount} -> ${v.audit}`)
  return v
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL statement_timeout='60s'`)
    const before = await counts(client)
    for (const [name, expected] of Object.entries(expectedBefore)) if (before[name] !== expected) throw new Error(`Preflight drift in ${name}: expected ${expected}, got ${before[name]}`)
    const target = await client.query('SELECT o.id, b.id branch FROM organization o JOIN branch b ON b."organizationId"=o.id WHERE o.id=$1 AND b.id=$2', [EXPECTED_ORG, EXPECTED_BRANCH])
    if (target.rowCount !== 1) throw new Error('Target tenant/branch mismatch')
    if (!execute) {
      console.log(JSON.stringify({ mode: 'DRY RUN', target: { organizationId: EXPECTED_ORG, branchId: EXPECTED_BRANCH }, before, plannedDeletes: deletes.map(([table]) => table), backupWaivedByUser: true }, null, 2))
      await client.query('ROLLBACK')
      return
    }
    const deleted = {}
    // The operator explicitly authorized removal of the two known test-only
    // reward rows. Keep the trigger bypass inside this transaction and restore
    // it before any other post-cleanup assertion or commit.
    await client.query('ALTER TABLE reward_ledger DISABLE TRIGGER reward_ledger_immutable')
    const deleteParameters = [EXPECTED_ORG, EXPECTED_BRANCH, REMOVED_USERS, REMOVED_EMPLOYEES]
    for (const [table, sql] of deletes) {
      const indexes = [...sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]))
      const parameterCount = Math.max(0, ...indexes)
      try {
        deleted[table] = (await client.query(sql, deleteParameters.slice(0, parameterCount))).rowCount
      } catch (error) {
        throw new Error(`Delete failed for ${table}: ${error.message}`)
      }
    }
    await client.query('ALTER TABLE reward_ledger ENABLE TRIGGER reward_ledger_immutable')
    const after = await counts(client)
    for (const name of Object.keys(expectedBefore)) {
      const shouldRemain = ['audit_event', 'product', 'category'].includes(name)
      const expected = shouldRemain ? expectedBefore[name] : 0
      if (after[name] !== expected) throw new Error(`Post-cleanup ${name}: expected ${expected}, got ${after[name]}`)
    }
    const preserved = await assertions(client, before.audit_event)
    await client.query('COMMIT')
    console.log(JSON.stringify({ mode: 'EXECUTED', target: { organizationId: EXPECTED_ORG, branchId: EXPECTED_BRANCH }, before, deleted, after, preserved, backupWaivedByUser: true }, null, 2))
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally { client.release() }
}

main().catch((error) => { console.error(`Cleanup failed and was rolled back: ${error.message}`); process.exitCode = 1 }).finally(() => pool.end())
