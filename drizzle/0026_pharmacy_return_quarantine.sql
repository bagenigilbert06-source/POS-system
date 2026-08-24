ALTER TABLE "sales_return_item"
  ADD COLUMN IF NOT EXISTS "originalSaleItemId" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_return_item_original_sale_item_fk'
  ) THEN
    ALTER TABLE "sales_return_item"
      ADD CONSTRAINT "sales_return_item_original_sale_item_fk"
      FOREIGN KEY ("originalSaleItemId") REFERENCES "sale_item"("id") ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "sales_return_item_original_sale_item_idx"
  ON "sales_return_item" ("originalSaleItemId");

CREATE TABLE IF NOT EXISTS "pharmacy_return_disposition" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "returnId" text NOT NULL REFERENCES "sales_return"("id") ON DELETE RESTRICT,
  "returnItemId" text NOT NULL REFERENCES "sales_return_item"("id") ON DELETE RESTRICT,
  "originalSaleItemId" text NOT NULL REFERENCES "sale_item"("id") ON DELETE RESTRICT,
  "originalAllocationId" text REFERENCES "sale_item_lot_allocation"("id") ON DELETE RESTRICT,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "originalLotId" text REFERENCES "inventory_lot"("id") ON DELETE RESTRICT,
  "lotNumber" text,
  "quantity" numeric(16,3) NOT NULL CHECK ("quantity" > 0),
  "status" text NOT NULL DEFAULT 'quarantined'
    CHECK ("status" IN ('quarantined','released','damaged','disposed','supplier_return')),
  "notes" text,
  "createdBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "pharmacy_return_disposition_org_status_idx"
  ON "pharmacy_return_disposition" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "pharmacy_return_disposition_return_idx"
  ON "pharmacy_return_disposition" ("returnId");
CREATE INDEX IF NOT EXISTS "pharmacy_return_disposition_allocation_idx"
  ON "pharmacy_return_disposition" ("originalAllocationId");
