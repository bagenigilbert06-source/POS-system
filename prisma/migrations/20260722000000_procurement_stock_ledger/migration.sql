CREATE TABLE IF NOT EXISTS "supplier" (
  "id" text PRIMARY KEY, "name" text NOT NULL, "phone" text, "email" text, "taxId" text,
  "address" text, "status" text NOT NULL DEFAULT 'active', "userId" text NOT NULL, "orgId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "supplier_org_idx" ON "supplier" ("orgId");

CREATE TABLE IF NOT EXISTS "purchase" (
  "id" text PRIMARY KEY, "purchaseNo" text NOT NULL, "supplierId" text REFERENCES "supplier"("id") ON DELETE RESTRICT,
  "supplierName" text NOT NULL, "reference" text, "subtotal" numeric(12,2) NOT NULL,
  "taxAmount" numeric(12,2) NOT NULL DEFAULT 0, "total" numeric(12,2) NOT NULL,
  "paymentStatus" text NOT NULL DEFAULT 'unpaid', "status" text NOT NULL DEFAULT 'received', "notes" text,
  "userId" text NOT NULL, "orgId" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "purchase_org_idx" ON "purchase" ("orgId");

CREATE TABLE IF NOT EXISTS "purchase_item" (
  "id" text PRIMARY KEY, "purchaseId" text NOT NULL REFERENCES "purchase"("id") ON DELETE CASCADE,
  "productId" text NOT NULL, "productName" text NOT NULL, "quantity" integer NOT NULL,
  "unitCost" numeric(12,2) NOT NULL, "totalCost" numeric(12,2) NOT NULL, "orgId" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_movement" (
  "id" text PRIMARY KEY, "productId" text NOT NULL, "productName" text NOT NULL, "type" text NOT NULL,
  "quantity" integer NOT NULL, "stockBefore" integer NOT NULL, "stockAfter" integer NOT NULL,
  "referenceType" text, "referenceId" text, "reason" text, "userId" text NOT NULL, "orgId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "stock_movement_org_idx" ON "stock_movement" ("orgId");
CREATE INDEX IF NOT EXISTS "stock_movement_product_idx" ON "stock_movement" ("productId");
