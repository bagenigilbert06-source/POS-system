import pg from 'pg'

const TARGET_ORGANIZATION_NAME = 'R T LIQUEUR BARRELS CO. LIMITED'
const TARGET_BRANCH_NAME = 'KISUMU MAIN STORE'
const PRESERVED_EMPLOYEE_NAME_PATTERN = /^s[yi]lvia\b/i

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL must be configured')

const pool = new pg.Pool({
  connectionString,
  max: 1,
  application_name: 'liquor-production-reset-audit',
  ssl: connectionString.includes('supabase.com') ? { rejectUnauthorized: false } : undefined,
})

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN READ ONLY')
    await client.query(`SET LOCAL statement_timeout = '30s'`)

    const organizations = await client.query(
      'SELECT id, name, slug, "businessType", "businessCategory", currency FROM organization WHERE lower(name) = lower($1)',
      [TARGET_ORGANIZATION_NAME],
    )
    if (organizations.rowCount !== 1) {
      throw new Error(`Expected exactly one target organization; found ${organizations.rowCount}`)
    }
    const organization = organizations.rows[0]

    const branches = await client.query(
      'SELECT id, "organizationId", code, name, "isMain" FROM branch WHERE "organizationId" = $1 AND lower(name) = lower($2)',
      [organization.id, TARGET_BRANCH_NAME],
    )
    if (branches.rowCount !== 1) {
      throw new Error(`Expected exactly one target branch; found ${branches.rowCount}`)
    }
    const branch = branches.rows[0]

    const columnsResult = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `)
    const columnsByTable = new Map()
    for (const row of columnsResult.rows) {
      const list = columnsByTable.get(row.table_name) ?? []
      list.push(row.column_name)
      columnsByTable.set(row.table_name, list)
    }

    const foreignKeys = await client.query(`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name,
             ccu.table_name AS referenced_table, ccu.column_name AS referenced_column,
             rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `)
    const integrityTriggers = await client.query(`
      SELECT c.relname AS table_name, t.tgname,
             pg_get_triggerdef(t.oid) AS definition,
             pg_get_functiondef(t.tgfoid) AS function_definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT t.tgisinternal
      ORDER BY c.relname, t.tgname
    `)

    const employees = await client.query(`
      SELECT e.id AS "employeeId", e."userId", e.name, e.email, e.phone,
             e.role AS "employeeRole", e.department, e.status AS "employeeStatus",
             om.id AS "membershipId", om.role AS "organizationRole",
             bm.id AS "branchMembershipId", bm.role AS "branchRole"
      FROM employee e
      LEFT JOIN organization_membership om
        ON om."userId" = e."userId" AND om."organizationId" = e."orgId"
      LEFT JOIN branch_membership bm
        ON bm."userId" = e."userId" AND bm."branchId" = $2
      WHERE e."orgId" = $1
      ORDER BY lower(e.name), e.id
    `, [organization.id, branch.id])
    const memberships = await client.query(`
      SELECT u.id AS "userId", u.name, u.email,
             om.id AS "membershipId", om.role AS "organizationRole",
             bm.id AS "branchMembershipId", bm.role AS "branchRole"
      FROM organization_membership om
      JOIN "user" u ON u.id = om."userId"
      LEFT JOIN branch_membership bm ON bm."userId" = u.id AND bm."branchId" = $2
      WHERE om."organizationId" = $1
      ORDER BY lower(u.name), u.id
    `, [organization.id, branch.id])

    const silvia = employees.rows.filter((row) => PRESERVED_EMPLOYEE_NAME_PATTERN.test(row.name?.trim() ?? ''))

    const branchMemberships = await client.query(`
      SELECT bm.id AS "branchMembershipId", bm.role AS "branchRole", bm."userId",
             u.name, u.email, om.role AS "organizationRole"
      FROM branch_membership bm
      JOIN "user" u ON u.id = bm."userId"
      LEFT JOIN organization_membership om
        ON om."userId" = bm."userId" AND om."organizationId" = $1
      WHERE bm."branchId" = $2
      ORDER BY lower(u.name), u.id
    `, [organization.id, branch.id])

    const counts = []
    for (const [table, columns] of columnsByTable) {
      let predicate = null
      let params = []
      if (columns.includes('organizationId')) {
        predicate = `${quoteIdentifier('organizationId')} = $1`
        params = [organization.id]
      } else if (columns.includes('orgId')) {
        predicate = `${quoteIdentifier('orgId')} = $1`
        params = [organization.id]
      } else if (columns.includes('branchId')) {
        predicate = `${quoteIdentifier('branchId')} = $1`
        params = [branch.id]
      }
      if (!predicate) continue
      try {
        const result = await client.query(`SELECT count(*)::int AS count FROM ${quoteIdentifier(table)} WHERE ${predicate}`, params)
        counts.push({ table, scope: predicate.replace(' = $1', ''), count: result.rows[0].count })
      } catch (error) {
        throw new Error(`Could not count ${table} using ${predicate}: ${error.message}`)
      }
    }

    const catalogue = await client.query(`
      SELECT
        (SELECT count(*)::int FROM category WHERE "orgId" = $1) AS categories,
        (SELECT count(*)::int FROM product WHERE "orgId" = $1) AS products
    `, [organization.id])

    const inventory = {}
    inventory.legacyProductStock = (await client.query(`
      SELECT count(*)::int AS products,
             count(*) FILTER (WHERE stock = 0)::int AS "zeroProducts",
             count(*) FILTER (WHERE stock > 0)::int AS "positiveProducts",
             count(*) FILTER (WHERE stock < 0)::int AS "negativeProducts",
             coalesce(sum(stock), 0)::numeric AS "totalStock"
      FROM product WHERE "orgId" = $1
    `, [organization.id])).rows[0]
    if (columnsByTable.has('inventory_balance')) {
      inventory.balances = (await client.query(`
        SELECT count(*)::int AS rows,
               count(*) FILTER (WHERE "onHand" = 0)::int AS "zeroRows",
               count(*) FILTER (WHERE "onHand" > 0)::int AS "positiveRows",
               count(*) FILTER (WHERE "onHand" < 0)::int AS "negativeRows",
               coalesce(sum("onHand"), 0)::numeric AS "totalQuantity",
               coalesce(sum(reserved), 0)::numeric AS "totalReserved",
               coalesce(sum(unavailable), 0)::numeric AS "totalUnavailable",
               coalesce(sum(incoming), 0)::numeric AS "totalIncoming"
        FROM inventory_balance WHERE "orgId" = $1 AND "branchId" = $2
      `, [organization.id, branch.id])).rows[0]
    }
    if (columnsByTable.has('stock_movement')) {
      inventory.movementsByType = (await client.query(`
        SELECT type, count(*)::int AS rows, coalesce(sum(quantity), 0)::numeric AS quantity
        FROM stock_movement WHERE "orgId" = $1 AND "branchId" = $2
        GROUP BY type ORDER BY type
      `, [organization.id, branch.id])).rows
      inventory.productHistory = (await client.query(`
        SELECT p.id AS "productId", p.name, p.sku, p.barcode, p.stock AS "legacyStock",
               ib."onHand", ib.reserved, ib.unavailable, ib.incoming,
               coalesce(sum(sm.quantity) FILTER (WHERE sm.type = 'stock_intake'), 0)::numeric AS "intakeQuantity",
               coalesce(sum(sm.quantity) FILTER (WHERE sm.type = 'sale'), 0)::numeric AS "saleQuantity",
               count(sm.*)::int AS "movementRows"
        FROM product p
        LEFT JOIN inventory_balance ib ON ib."productId" = p.id AND ib."branchId" = $2
        LEFT JOIN stock_movement sm ON sm."productId" = p.id AND sm."orgId" = $1 AND sm."branchId" = $2
        WHERE p."orgId" = $1 AND (ib.id IS NOT NULL OR sm.id IS NOT NULL)
        GROUP BY p.id, p.name, p.sku, p.barcode, p.stock, ib."onHand", ib.reserved, ib.unavailable, ib.incoming
        ORDER BY p.name, p.id
      `, [organization.id, branch.id])).rows
      inventory.stockIntakes = (await client.query(`
        SELECT si.id, si."intakeNo", si."externalReference", si."sourceName", si."sourceType",
               si.notes, si.status, si."receivedAt", si."createdAt",
               sii.id AS "itemId", sii."productId", sii."enteredQuantity", sii."enteredUnit",
               sii."baseQuantity", sii."unitCost",
               p.name AS "productName"
        FROM stock_intake si
        JOIN stock_intake_item sii ON sii."intakeId" = si.id
        JOIN product p ON p.id = sii."productId"
        WHERE si."orgId" = $1 AND si."branchId" = $2
        ORDER BY si."createdAt", si.id, sii.id
      `, [organization.id, branch.id])).rows
      inventory.movementHistory = (await client.query(`
        SELECT sm.id, sm."productId", sm."productName", sm.type, sm.quantity,
               sm."stockBefore", sm."stockAfter", sm."referenceType", sm."referenceId",
               sm.reason, sm."createdAt"
        FROM stock_movement sm
        WHERE sm."orgId" = $1 AND sm."branchId" = $2
        ORDER BY sm."createdAt", sm.id
      `, [organization.id, branch.id])).rows
    }

    const salesSummary = (await client.query(`
      SELECT status, "paymentMethod", count(*)::int AS sales,
             coalesce(sum(total), 0)::numeric AS revenue,
             coalesce(sum("discountAmount"), 0)::numeric AS discounts
      FROM sale WHERE "orgId" = $1
      GROUP BY status, "paymentMethod" ORDER BY status, "paymentMethod"
    `, [organization.id])).rows

    const report = {
      mode: 'DRY RUN / READ ONLY',
      target: { organization, branch },
      preservedEmployeeMatches: silvia,
      allTenantEmployees: employees.rows,
      allTenantMemberships: memberships.rows,
      allTargetBranchMemberships: branchMemberships.rows,
      proposedEmployeeRemoval: employees.rows.filter((row) => !silvia.includes(row)),
      preservedCatalogue: catalogue.rows[0],
      inventory,
      salesSummary,
      scopedTableCounts: counts,
      discoveredTables: [...columnsByTable.keys()],
      foreignKeys: foreignKeys.rows,
      integrityTriggers: integrityTriggers.rows,
      safety: {
        databaseWritesPerformed: false,
        backupConfirmed: false,
        safeToExecute: false,
        reasons: [
          'A production backup/snapshot has not been independently confirmed.',
          'Staff classified as test-only has not yet been confirmed by the operator.',
          'Opening inventory reconstruction must be proven from stock history before any cleanup.',
        ],
      },
    }
    console.log(JSON.stringify(report, null, 2))
    await client.query('ROLLBACK')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

main()
  .catch((error) => {
    console.error(`Audit failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
