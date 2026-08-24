ALTER TABLE "pharmacy_return_disposition"
  ADD COLUMN IF NOT EXISTS "supplierReturnReference" text,
  ADD COLUMN IF NOT EXISTS "supplierReturnStatus" text,
  ADD COLUMN IF NOT EXISTS "supplierCreditNote" text,
  ADD COLUMN IF NOT EXISTS "supplierResolvedBy" text,
  ADD COLUMN IF NOT EXISTS "supplierResolvedAt" timestamp;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_return_supplier_status_check') THEN
    ALTER TABLE "pharmacy_return_disposition" ADD CONSTRAINT "pharmacy_return_supplier_status_check"
      CHECK ("supplierReturnStatus" IS NULL OR "supplierReturnStatus" IN ('pending','accepted','credited','rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_return_supplier_resolved_by_fk') THEN
    ALTER TABLE "pharmacy_return_disposition" ADD CONSTRAINT "pharmacy_return_supplier_resolved_by_fk"
      FOREIGN KEY ("supplierResolvedBy") REFERENCES "user"("id") ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "pharmacy_return_supplier_status_idx"
  ON "pharmacy_return_disposition" ("organizationId", "supplierReturnStatus", "updatedAt");
