CREATE TABLE IF NOT EXISTS "pharmacy_configuration" (
  "organizationId" text PRIMARY KEY REFERENCES "organization"("id") ON DELETE CASCADE,
  "fefoEnabled" boolean NOT NULL DEFAULT true,
  "expiryWarningDays" json NOT NULL DEFAULT '[90,60,30,7]'::json,
  "prescriptionWorkflowEnabled" boolean NOT NULL DEFAULT true,
  "restrictedItemWorkflowEnabled" boolean NOT NULL DEFAULT true,
  "returnedStockDefaultStatus" text NOT NULL DEFAULT 'quarantined',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "pharmacy_configuration_return_status_check"
    CHECK ("returnedStockDefaultStatus" IN ('returned_to_stock','quarantined','damaged','disposal_required'))
);

CREATE TABLE IF NOT EXISTS "pharmacy_product" (
  "productId" text PRIMARY KEY REFERENCES "product"("id") ON DELETE CASCADE,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "genericName" text,
  "internalCode" text,
  "manufacturer" text,
  "strength" text,
  "dosageForm" text,
  "packSize" text,
  "prescriptionRequired" boolean NOT NULL DEFAULT false,
  "restrictedItem" boolean NOT NULL DEFAULT false,
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "pharmacy_product_org_idx" ON "pharmacy_product" ("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_product_org_internal_code_unique"
  ON "pharmacy_product" ("organizationId", "internalCode") WHERE "internalCode" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "pharmacy_product_search_idx"
  ON "pharmacy_product" ("organizationId", "genericName", "manufacturer");

CREATE TABLE IF NOT EXISTS "sale_item_lot_allocation" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "saleId" text NOT NULL REFERENCES "sale"("id") ON DELETE RESTRICT,
  "saleItemId" text NOT NULL REFERENCES "sale_item"("id") ON DELETE RESTRICT,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "lotId" text NOT NULL REFERENCES "inventory_lot"("id") ON DELETE RESTRICT,
  "lotNumber" text NOT NULL,
  "expiresAt" timestamp,
  "quantity" numeric(16,3) NOT NULL CHECK ("quantity" > 0),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "sale_item_lot_allocation_unique"
  ON "sale_item_lot_allocation" ("saleItemId", "lotId");
CREATE INDEX IF NOT EXISTS "sale_item_lot_allocation_org_sale_idx"
  ON "sale_item_lot_allocation" ("organizationId", "saleId");
CREATE INDEX IF NOT EXISTS "sale_item_lot_allocation_lot_idx"
  ON "sale_item_lot_allocation" ("lotId");

CREATE TABLE IF NOT EXISTS "pharmacy_sale_record" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "saleId" text NOT NULL REFERENCES "sale"("id") ON DELETE RESTRICT,
  "prescriptionReference" text,
  "prescriberReference" text,
  "notes" text,
  "approvedBy" text REFERENCES "user"("id") ON DELETE RESTRICT,
  "createdBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_sale_record_org_sale_unique"
  ON "pharmacy_sale_record" ("organizationId", "saleId");
CREATE INDEX IF NOT EXISTS "pharmacy_sale_record_org_reference_idx"
  ON "pharmacy_sale_record" ("organizationId", "prescriptionReference");

CREATE TABLE IF NOT EXISTS "restricted_item_audit" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "saleId" text NOT NULL REFERENCES "sale"("id") ON DELETE RESTRICT,
  "saleItemId" text NOT NULL REFERENCES "sale_item"("id") ON DELETE RESTRICT,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "lotId" text REFERENCES "inventory_lot"("id") ON DELETE RESTRICT,
  "cashierId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "approvedBy" text REFERENCES "user"("id") ON DELETE RESTRICT,
  "quantity" numeric(16,3) NOT NULL CHECK ("quantity" > 0),
  "customerReference" text,
  "reason" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "restricted_item_audit_org_created_idx"
  ON "restricted_item_audit" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "restricted_item_audit_sale_idx" ON "restricted_item_audit" ("saleId");

-- Pharmacy products must be lot tracked. Existing products are not changed;
-- metadata is added explicitly through the pharmacy product workflow.
