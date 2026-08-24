ALTER TABLE "pharmacy_sale_record"
  ADD COLUMN IF NOT EXISTS "patientReference" text,
  ADD COLUMN IF NOT EXISTS "prescriptionDocumentUrl" text,
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'dispensed',
  ADD COLUMN IF NOT EXISTS "issuedAt" timestamp,
  ADD COLUMN IF NOT EXISTS "expiresAt" timestamp,
  ADD COLUMN IF NOT EXISTS "verifiedBy" text,
  ADD COLUMN IF NOT EXISTS "verifiedAt" timestamp,
  ADD COLUMN IF NOT EXISTS "approvalReason" text,
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_sale_record_verified_by_fk') THEN
    ALTER TABLE "pharmacy_sale_record" ADD CONSTRAINT "pharmacy_sale_record_verified_by_fk"
      FOREIGN KEY ("verifiedBy") REFERENCES "user"("id") ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_sale_record_status_check') THEN
    ALTER TABLE "pharmacy_sale_record" ADD CONSTRAINT "pharmacy_sale_record_status_check"
      CHECK ("status" IN ('pending','verified','partially_dispensed','dispensed','cancelled','rejected','expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "pharmacy_sale_record_org_status_idx"
  ON "pharmacy_sale_record" ("organizationId", "status", "createdAt");

CREATE TABLE IF NOT EXISTS "pharmacy_prescription_item" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "prescriptionRecordId" text NOT NULL REFERENCES "pharmacy_sale_record"("id") ON DELETE CASCADE,
  "saleItemId" text REFERENCES "sale_item"("id") ON DELETE RESTRICT,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "prescribedQuantity" numeric(16,3) NOT NULL CHECK ("prescribedQuantity" > 0),
  "dispensedQuantity" numeric(16,3) NOT NULL CHECK ("dispensedQuantity" >= 0 AND "dispensedQuantity" <= "prescribedQuantity"),
  "repeatsAuthorized" integer NOT NULL DEFAULT 0 CHECK ("repeatsAuthorized" >= 0),
  "repeatsRemaining" integer NOT NULL DEFAULT 0 CHECK ("repeatsRemaining" >= 0 AND "repeatsRemaining" <= "repeatsAuthorized"),
  "directions" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "pharmacy_prescription_item_record_product_idx"
  ON "pharmacy_prescription_item" ("prescriptionRecordId", "productId");
CREATE INDEX IF NOT EXISTS "pharmacy_prescription_item_org_idx"
  ON "pharmacy_prescription_item" ("organizationId");

CREATE TABLE IF NOT EXISTS "pharmacy_medicine_recall" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "lotId" text NOT NULL REFERENCES "inventory_lot"("id") ON DELETE RESTRICT,
  "reference" text NOT NULL,
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','resolved')),
  "initiatedBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "resolvedBy" text REFERENCES "user"("id") ON DELETE RESTRICT,
  "initiatedAt" timestamp NOT NULL DEFAULT now(),
  "resolvedAt" timestamp,
  "resolutionNotes" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_medicine_recall_active_lot_unique"
  ON "pharmacy_medicine_recall" ("organizationId", "lotId") WHERE "status" = 'active';
CREATE INDEX IF NOT EXISTS "pharmacy_medicine_recall_org_status_idx"
  ON "pharmacy_medicine_recall" ("organizationId", "status", "createdAt");

-- Pharmacy medicines without an expiry date must be reviewed before sale.
-- Only quantities changed by this migration are added to unavailable stock.
WITH newly_quarantined AS (
  UPDATE "inventory_lot" lot
  SET "status" = 'quarantined'
  FROM "pharmacy_product" medicine
  WHERE medicine."productId" = lot."productId"
    AND medicine."organizationId" = lot."orgId"
    AND lot."expiresAt" IS NULL
    AND lot."quantity" > 0
    AND lot."status" = 'available'
  RETURNING lot."productId", lot."branchId", lot."orgId", lot."quantity"
), missing AS (
  SELECT "productId", "branchId", "orgId", SUM("quantity") AS "quantity"
  FROM newly_quarantined
  GROUP BY "productId", "branchId", "orgId"
)
UPDATE "inventory_balance" balance
SET "unavailable" = balance."unavailable" + missing."quantity", "updatedAt" = now()
FROM missing
WHERE balance."productId" = missing."productId"
  AND balance."branchId" = missing."branchId"
  AND balance."orgId" = missing."orgId";
