ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "saleId" text REFERENCES "sale"("id") ON DELETE RESTRICT;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "creditSaleId" text REFERENCES "credit_sale"("id") ON DELETE RESTRICT;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "customerSnapshot" json NOT NULL DEFAULT '{}';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "businessSnapshot" json NOT NULL DEFAULT '{}';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "discountAmount" numeric(12,2) NOT NULL DEFAULT '0';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "shippingAmount" numeric(12,2) NOT NULL DEFAULT '0';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "roundingAmount" numeric(12,2) NOT NULL DEFAULT '0';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "taxableAmount" numeric(12,2) NOT NULL DEFAULT '0';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "taxRate" numeric(7,4) NOT NULL DEFAULT '0';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "amountPaid" numeric(12,2) NOT NULL DEFAULT '0';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "creditedAmount" numeric(12,2) NOT NULL DEFAULT '0';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "balanceDue" numeric(12,2) NOT NULL DEFAULT '0';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "fiscalStatus" text NOT NULL DEFAULT 'not_submitted';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "fiscalReference" text;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "idempotencyKey" text;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "issuedAt" timestamp;
ALTER TABLE "invoice_item" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "invoice_item" ADD COLUMN IF NOT EXISTS "unit" text NOT NULL DEFAULT 'each';
ALTER TABLE "invoice_item" ADD COLUMN IF NOT EXISTS "discountAmount" numeric(12,2) NOT NULL DEFAULT '0';
ALTER TABLE "invoice_item" ADD COLUMN IF NOT EXISTS "invoiceDiscountShare" numeric(12,2) NOT NULL DEFAULT '0';
ALTER TABLE "invoice_item" ADD COLUMN IF NOT EXISTS "taxRate" numeric(7,4) NOT NULL DEFAULT '0';
ALTER TABLE "invoice_item" ADD COLUMN IF NOT EXISTS "taxAmount" numeric(12,2) NOT NULL DEFAULT '0';
-- Preserve duplicate legacy invoice numbers without deleting any record.
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "orgId", "invoiceNo" ORDER BY "createdAt", "id") AS duplicate_number
  FROM "invoice"
)
UPDATE "invoice" AS target
SET "invoiceNo" = target."invoiceNo" || '-LEGACY-' || target."id"
FROM ranked
WHERE target."id" = ranked."id" AND ranked.duplicate_number > 1;
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_org_number_unique" ON "invoice" ("orgId", "invoiceNo");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_org_idempotency_unique" ON "invoice" ("orgId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_sale_unique" ON "invoice" ("saleId");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_credit_sale_unique" ON "invoice" ("creditSaleId");
CREATE INDEX IF NOT EXISTS "invoice_org_branch_created_idx" ON "invoice" ("orgId", "branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "invoice_org_status_due_idx" ON "invoice" ("orgId", "status", "dueDate");
CREATE TABLE IF NOT EXISTS "invoice_number_sequence" ("organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE, "year" integer NOT NULL, "lastNumber" integer NOT NULL DEFAULT 0, "updatedAt" timestamp NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_number_sequence_org_year_unique" ON "invoice_number_sequence" ("organizationId", "year");
INSERT INTO "invoice_number_sequence" ("organizationId", "year", "lastNumber")
SELECT "orgId", split_part("invoiceNo", '-', 2)::integer, max(split_part("invoiceNo", '-', 3)::integer)
FROM "invoice"
WHERE "invoiceNo" ~ '^INV-[0-9]{4}-[0-9]+$'
GROUP BY "orgId", split_part("invoiceNo", '-', 2)::integer
ON CONFLICT ("organizationId", "year") DO UPDATE
SET "lastNumber" = GREATEST("invoice_number_sequence"."lastNumber", EXCLUDED."lastNumber"), "updatedAt" = now();
CREATE TABLE IF NOT EXISTS "invoice_payment" ("id" text PRIMARY KEY NOT NULL, "invoiceId" text NOT NULL REFERENCES "invoice"("id") ON DELETE RESTRICT, "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE, "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT, "amount" numeric(12,2) NOT NULL, "method" text NOT NULL, "reference" text, "idempotencyKey" text NOT NULL, "receivedBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT, "createdAt" timestamp NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS "invoice_payment_invoice_idx" ON "invoice_payment" ("invoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_payment_idempotency_unique" ON "invoice_payment" ("organizationId", "idempotencyKey");
ALTER TABLE "credit_payment" ADD COLUMN IF NOT EXISTS "idempotencyKey" text;
ALTER TABLE "credit_sale" ADD COLUMN IF NOT EXISTS "creditedAmount" numeric(12,2) NOT NULL DEFAULT '0';
CREATE UNIQUE INDEX IF NOT EXISTS "credit_payment_org_idempotency_unique" ON "credit_payment" ("orgId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "credit_payment_credit_sale_created_idx" ON "credit_payment" ("creditSaleId", "createdAt");
CREATE INDEX IF NOT EXISTS "credit_sale_org_status_due_idx" ON "credit_sale" ("orgId", "status", "dueDate");
CREATE TABLE IF NOT EXISTS "finance_legacy_archive" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE RESTRICT,
  "entityType" text NOT NULL,
  "legacyId" text NOT NULL,
  "reason" text NOT NULL,
  "data" json NOT NULL,
  "archivedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "finance_legacy_archive_entity_legacy_unique" ON "finance_legacy_archive" ("entityType", "legacyId");
CREATE INDEX IF NOT EXISTS "finance_legacy_archive_org_idx" ON "finance_legacy_archive" ("organizationId");
WITH ranked AS (
  SELECT source.*, row_number() OVER (PARTITION BY "saleId" ORDER BY "createdAt", "id") AS duplicate_number
  FROM "credit_sale" AS source
)
INSERT INTO "finance_legacy_archive" ("id", "organizationId", "entityType", "legacyId", "reason", "data")
SELECT 'credit_sale_duplicate:' || "id", "orgId", 'credit_sale', "id", 'Duplicate legacy receivable for the same sale; payments consolidated into the earliest record', row_to_json(ranked)
FROM ranked WHERE duplicate_number > 1
ON CONFLICT ("entityType", "legacyId") DO NOTHING;
WITH ranked AS (
  SELECT "id", first_value("id") OVER (PARTITION BY "saleId" ORDER BY "createdAt", "id") AS keeper_id,
         row_number() OVER (PARTITION BY "saleId" ORDER BY "createdAt", "id") AS duplicate_number
  FROM "credit_sale"
)
UPDATE "credit_payment" AS payment
SET "creditSaleId" = ranked.keeper_id
FROM ranked
WHERE payment."creditSaleId" = ranked."id" AND ranked.duplicate_number > 1;
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "saleId" ORDER BY "createdAt", "id") AS duplicate_number
  FROM "credit_sale"
)
DELETE FROM "credit_sale" AS target USING ranked
WHERE target."id" = ranked."id" AND ranked.duplicate_number > 1;
UPDATE "credit_sale" AS target
SET "amountPaid" = COALESCE(payments.paid, 0),
    "status" = CASE WHEN COALESCE(payments.paid, 0) + target."creditedAmount" >= target."amount" THEN CASE WHEN target."creditedAmount" > 0 THEN 'credited' ELSE 'paid' END WHEN COALESCE(payments.paid, 0) > 0 THEN 'partially_paid' ELSE 'unpaid' END,
    "updatedAt" = now()
FROM (SELECT "creditSaleId", sum("amount") AS paid FROM "credit_payment" GROUP BY "creditSaleId") AS payments
WHERE target."id" = payments."creditSaleId";
CREATE UNIQUE INDEX IF NOT EXISTS "credit_sale_sale_unique" ON "credit_sale" ("saleId");
WITH ranked AS (
  SELECT source.*, row_number() OVER (PARTITION BY "orgId", "customerId" ORDER BY "createdAt", "id") AS duplicate_number
  FROM "customer_credit_limit" AS source
)
INSERT INTO "finance_legacy_archive" ("id", "organizationId", "entityType", "legacyId", "reason", "data")
SELECT 'credit_limit_duplicate:' || "id", "orgId", 'customer_credit_limit', "id", 'Duplicate legacy credit-limit row; retained the earliest configuration and rebuilt its balance from receivables', row_to_json(ranked)
FROM ranked WHERE duplicate_number > 1
ON CONFLICT ("entityType", "legacyId") DO NOTHING;
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "orgId", "customerId" ORDER BY "createdAt", "id") AS duplicate_number
  FROM "customer_credit_limit"
)
DELETE FROM "customer_credit_limit" AS target USING ranked
WHERE target."id" = ranked."id" AND ranked.duplicate_number > 1;
UPDATE "customer_credit_limit" SET "currentBalance" = 0, "updatedAt" = now();
UPDATE "customer_credit_limit" AS target
SET "currentBalance" = COALESCE(balance.outstanding, 0), "updatedAt" = now()
FROM (
  SELECT "orgId", "customerId", sum(GREATEST("amount" - "amountPaid" - "creditedAmount", 0)) AS outstanding
  FROM "credit_sale" GROUP BY "orgId", "customerId"
) AS balance
WHERE target."orgId" = balance."orgId" AND target."customerId" = balance."customerId";
CREATE UNIQUE INDEX IF NOT EXISTS "customer_credit_limit_org_customer_unique" ON "customer_credit_limit" ("orgId", "customerId");
CREATE TABLE IF NOT EXISTS "invoice_credit_note" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text REFERENCES "branch"("id") ON DELETE RESTRICT,
  "invoiceId" text NOT NULL REFERENCES "invoice"("id") ON DELETE RESTRICT,
  "returnId" text REFERENCES "sales_return"("id") ON DELETE RESTRICT,
  "creditNoteNo" text NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'issued',
  "fiscalStatus" text NOT NULL DEFAULT 'not_submitted',
  "fiscalReference" text,
  "idempotencyKey" text NOT NULL,
  "createdBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_credit_note_org_number_unique" ON "invoice_credit_note" ("organizationId", "creditNoteNo");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_credit_note_org_idempotency_unique" ON "invoice_credit_note" ("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_credit_note_return_unique" ON "invoice_credit_note" ("returnId");
CREATE INDEX IF NOT EXISTS "invoice_credit_note_invoice_created_idx" ON "invoice_credit_note" ("invoiceId", "createdAt");

-- Deterministic legacy backfill. Old invoices did not store payment records,
-- therefore they are treated as wholly outstanding unless already marked paid.
UPDATE "invoice"
SET "amountPaid" = CASE WHEN "status" = 'paid' THEN "total" ELSE 0 END,
    "balanceDue" = CASE WHEN "status" = 'paid' THEN 0 ELSE "total" END,
    "taxableAmount" = "subtotal",
    "taxRate" = CASE WHEN "taxAmount" > 0 THEN 16 ELSE 0 END,
    "issuedAt" = CASE WHEN "status" IN ('sent', 'issued', 'partially_paid', 'paid', 'overdue') THEN "createdAt" ELSE "issuedAt" END,
    "status" = CASE WHEN "status" = 'sent' THEN 'issued' ELSE "status" END
WHERE "idempotencyKey" IS NULL;

UPDATE "invoice" AS target
SET "customerSnapshot" = json_build_object('name', source."name", 'phone', source."phone", 'email', source."email", 'address', source."address", 'kraPin', source."kraPin")
FROM "customer" AS source
WHERE target."customerId" = source."id" AND target."customerSnapshot"::jsonb = '{}'::jsonb;

UPDATE "invoice" AS target
SET "businessSnapshot" = json_build_object('name', COALESCE(settings."receiptBusinessName", settings."displayName", org."name"), 'address', COALESCE(settings."receiptAddress", settings."address"), 'phone', COALESCE(settings."receiptPhone", org."phone"), 'email', org."businessEmail", 'kraPin', settings."taxIdentifier", 'logoUrl', settings."receiptLogoUrl", 'taxName', COALESCE(settings."taxName", 'Tax'))
FROM "organization" AS org
LEFT JOIN "business_settings" AS settings ON settings."organizationId" = org."id"
WHERE target."orgId" = org."id" AND target."businessSnapshot"::jsonb = '{}'::jsonb;
