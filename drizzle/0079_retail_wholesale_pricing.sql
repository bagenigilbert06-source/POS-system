ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "wholesalePrice" numeric(12,2);
ALTER TABLE "product_package" ADD COLUMN IF NOT EXISTS "wholesalePrice" numeric(12,2);
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "priceLevel" text NOT NULL DEFAULT 'retail';
ALTER TABLE "sale" ADD COLUMN IF NOT EXISTS "priceLevel" text NOT NULL DEFAULT 'retail';
ALTER TABLE "sale_item" ADD COLUMN IF NOT EXISTS "priceLevel" text NOT NULL DEFAULT 'retail';
ALTER TABLE "sale_item" ADD COLUMN IF NOT EXISTS "retailUnitPrice" numeric(12,2);

UPDATE "sale_item" SET "retailUnitPrice" = "unitPrice" WHERE "retailUnitPrice" IS NULL;

ALTER TABLE "product" ADD CONSTRAINT "product_wholesale_price_nonnegative" CHECK ("wholesalePrice" IS NULL OR "wholesalePrice" >= 0);
ALTER TABLE "product_package" ADD CONSTRAINT "product_package_wholesale_price_nonnegative" CHECK ("wholesalePrice" IS NULL OR "wholesalePrice" >= 0);
ALTER TABLE "customer" ADD CONSTRAINT "customer_price_level_valid" CHECK ("priceLevel" IN ('retail', 'wholesale'));
ALTER TABLE "sale" ADD CONSTRAINT "sale_price_level_valid" CHECK ("priceLevel" IN ('retail', 'wholesale'));
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_price_level_valid" CHECK ("priceLevel" IN ('retail', 'wholesale'));

CREATE INDEX IF NOT EXISTS "customer_org_price_level_idx" ON "customer" ("orgId", "priceLevel");
CREATE INDEX IF NOT EXISTS "sale_org_price_level_created_idx" ON "sale" ("orgId", "priceLevel", "createdAt");
