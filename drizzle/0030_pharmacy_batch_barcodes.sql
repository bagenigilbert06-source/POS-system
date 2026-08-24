ALTER TABLE "inventory_lot" ADD COLUMN IF NOT EXISTS "barcode" text;
ALTER TABLE "inventory_transfer_lot_allocation" ADD COLUMN IF NOT EXISTS "barcode" text;
CREATE INDEX IF NOT EXISTS "inventory_lot_org_barcode_idx" ON "inventory_lot" ("orgId", "barcode") WHERE "barcode" IS NOT NULL;
