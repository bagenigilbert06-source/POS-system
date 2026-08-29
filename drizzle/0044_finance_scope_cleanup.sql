-- Preserve the only retired finance data before removing its feature tables.
INSERT INTO "finance_legacy_archive" (
  "id", "organizationId", "entityType", "legacyId", "reason", "data"
)
SELECT
  'finance_budget_scope_cleanup:' || "id",
  "organizationId",
  'finance_budget',
  "id",
  'Archived when Pesaby adopted the final retail-finance scope',
  row_to_json("finance_budget")
FROM "finance_budget"
ON CONFLICT ("entityType", "legacyId") DO NOTHING;
--> statement-breakpoint

-- Remove records belonging to retired entity types. The production audit log
-- remains untouched; it is immutable historical evidence.
DELETE FROM "finance_document" WHERE "entityType" = 'supplier_bill';
DELETE FROM "finance_approval" WHERE "entityType" = 'supplier_bill' OR "actionType" = 'supplier_payment';
DELETE FROM "finance_approval_policy" WHERE "actionType" = 'supplier_payment';
--> statement-breakpoint

DROP TABLE IF EXISTS "supplier_bill_stock_intake";
DROP TABLE IF EXISTS "supplier_bill_payment";
DROP TABLE IF EXISTS "supplier_bill_item";
DROP TABLE IF EXISTS "supplier_bill";
DROP TABLE IF EXISTS "finance_budget";
--> statement-breakpoint

-- Purchase-order receiving was never populated. Keep the legacy purchase and
-- purchase_item rows for history, but sever their unused PO/receipt links.
DROP INDEX IF EXISTS "purchase_receipt_link_unique";
ALTER TABLE "purchase" DROP COLUMN IF EXISTS "receiptId";
ALTER TABLE "purchase" DROP COLUMN IF EXISTS "poId";
DROP TABLE IF EXISTS "purchase_receipt_item";
DROP TABLE IF EXISTS "purchase_receipt";
DROP TABLE IF EXISTS "purchase_order_item";
DROP TABLE IF EXISTS "purchase_order";
--> statement-breakpoint

-- Pesaby is a retail finance system, not a double-entry accounting package.
-- These placeholder tables were empty and had no authoritative posting model.
DROP TABLE IF EXISTS "general_ledger";
DROP TABLE IF EXISTS "gl_account";
DROP TABLE IF EXISTS "financial_statement";
