ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "brand" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "volume" numeric(10, 2);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "volumeUnit" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "abv" numeric(5, 2);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "countryOfOrigin" text;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "unitsPerPack" integer;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "preferredSupplierId" text;
CREATE UNIQUE INDEX IF NOT EXISTS "product_org_active_sku_unique" ON "product" ("orgId", "sku") WHERE "isActive" = true AND "sku" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "product_org_active_barcode_unique" ON "product" ("orgId", "barcode") WHERE "isActive" = true AND "barcode" IS NOT NULL;
