ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "branchId" text;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "customerSnapshot" json NOT NULL DEFAULT '{}'::json;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "businessSnapshot" json NOT NULL DEFAULT '{}'::json;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "discountAmount" numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "taxableAmount" numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "taxRate" numeric(7,4) NOT NULL DEFAULT 0;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "terms" text;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "internalNote" text;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "sentAt" timestamp;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "acceptedAt" timestamp;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "acceptedBy" text;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "declinedAt" timestamp;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "renewedAt" timestamp;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "convertedAt" timestamp;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "statusReason" text;
ALTER TABLE "quotation" ADD COLUMN IF NOT EXISTS "updatedBy" text;

ALTER TABLE "quotation_item" ADD COLUMN IF NOT EXISTS "productId" text;
ALTER TABLE "quotation_item" ADD COLUMN IF NOT EXISTS "sku" text;
ALTER TABLE "quotation_item" ADD COLUMN IF NOT EXISTS "unit" text NOT NULL DEFAULT 'each';
ALTER TABLE "quotation_item" ADD COLUMN IF NOT EXISTS "subtotal" numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotation_item" ADD COLUMN IF NOT EXISTS "discountAmount" numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotation_item" ADD COLUMN IF NOT EXISTS "taxRate" numeric(7,4) NOT NULL DEFAULT 0;
ALTER TABLE "quotation_item" ADD COLUMN IF NOT EXISTS "taxAmount" numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "quotationId" text;

DO $$ BEGIN
  ALTER TABLE "quotation" ADD CONSTRAINT "quotation_branchId_branch_id_fk" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quotation" ADD CONSTRAINT "quotation_acceptedBy_user_id_fk" FOREIGN KEY ("acceptedBy") REFERENCES "user"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quotation_item" ADD CONSTRAINT "quotation_item_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "sale" ADD CONSTRAINT "sale_quotationId_quotation_id_fk" FOREIGN KEY ("quotationId") REFERENCES "quotation"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "quotation_number_sequence" (
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "year" integer NOT NULL,
  "lastNumber" integer NOT NULL DEFAULT 0,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "quotation_number_sequence_org_year_unique" ON "quotation_number_sequence"("organizationId", "year");
CREATE UNIQUE INDEX IF NOT EXISTS "quotation_org_number_unique" ON "quotation"("orgId", "quoteNo");
CREATE INDEX IF NOT EXISTS "quotation_org_status_created_idx" ON "quotation"("orgId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "quotation_org_branch_created_idx" ON "quotation"("orgId", "branchId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "sale_quotation_unique" ON "sale"("quotationId") WHERE "quotationId" IS NOT NULL;
