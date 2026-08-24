CREATE TABLE IF NOT EXISTS "product_package" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "packageType" text NOT NULL,
  "barcode" text,
  "sellingPrice" numeric(12,2) NOT NULL,
  "baseUnitQuantity" integer NOT NULL CHECK ("baseUnitQuantity" > 1),
  "etimsItemCode" text,
  "etimsUnitCode" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_package_org_barcode_unique" ON "product_package" ("organizationId", "barcode") WHERE "barcode" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "product_package_product_name_unique" ON "product_package" ("productId", "name");
CREATE INDEX IF NOT EXISTS "product_package_product_active_idx" ON "product_package" ("organizationId", "productId", "isActive");
ALTER TABLE "sale_item" ADD COLUMN IF NOT EXISTS "packageId" text REFERENCES "product_package"("id") ON DELETE RESTRICT;
ALTER TABLE "sale_item" ADD COLUMN IF NOT EXISTS "packageName" text;
ALTER TABLE "sale_item" ADD COLUMN IF NOT EXISTS "baseUnitQuantity" integer NOT NULL DEFAULT 1;
