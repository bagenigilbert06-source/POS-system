-- Production inventory foundation. Idempotent because earlier migrations in this
-- repository predate the Drizzle journal and may already be present in deployments.
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "trackingMode" text NOT NULL DEFAULT 'none';
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "costingMethod" text NOT NULL DEFAULT 'weighted_average';
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "allowDecimalQuantity" boolean NOT NULL DEFAULT false;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "shelfLifeDays" integer;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "expiryAlertDays" integer;
ALTER TABLE "supplier" ADD COLUMN IF NOT EXISTS "contactPerson" text;
ALTER TABLE "supplier" ADD COLUMN IF NOT EXISTS "paymentTermsDays" integer NOT NULL DEFAULT 0;
ALTER TABLE "supplier" ADD COLUMN IF NOT EXISTS "leadTimeDays" integer NOT NULL DEFAULT 0;
ALTER TABLE "supplier" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "stock_movement" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE restrict;
ALTER TABLE "stock_movement" ADD COLUMN IF NOT EXISTS "lotId" text;
ALTER TABLE "stock_movement" ADD COLUMN IF NOT EXISTS "serialId" text;
ALTER TABLE "stock_movement" ADD COLUMN IF NOT EXISTS "unitCost" numeric(12,4);
ALTER TABLE "stock_adjustment" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE restrict;
ALTER TABLE "stock_adjustment" ADD COLUMN IF NOT EXISTS "countMode" text NOT NULL DEFAULT 'cycle';
ALTER TABLE "stock_adjustment" ADD COLUMN IF NOT EXISTS "blindCount" boolean NOT NULL DEFAULT false;
ALTER TABLE "stock_adjustment" ADD COLUMN IF NOT EXISTS "submittedAt" timestamp;
ALTER TABLE "sale_item" ADD COLUMN IF NOT EXISTS "unitCostAtSale" numeric(12,4) NOT NULL DEFAULT 0;
ALTER TABLE "sale_item" ADD COLUMN IF NOT EXISTS "totalCost" numeric(12,4) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "inventory_balance" (
  "id" text PRIMARY KEY, "productId" text NOT NULL REFERENCES "product"("id") ON DELETE cascade,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE cascade,
  "onHand" numeric(16,3) NOT NULL DEFAULT 0, "reserved" numeric(16,3) NOT NULL DEFAULT 0,
  "unavailable" numeric(16,3) NOT NULL DEFAULT 0, "incoming" numeric(16,3) NOT NULL DEFAULT 0,
  "reorderPoint" numeric(16,3), "reorderTarget" numeric(16,3), "safetyStock" numeric(16,3) NOT NULL DEFAULT 0,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade, "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_balance_nonnegative" CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "unavailable" >= 0 AND "incoming" >= 0 AND "onHand" >= "reserved" + "unavailable")
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_balance_product_branch_unique" ON "inventory_balance"("productId", "branchId");
CREATE INDEX IF NOT EXISTS "inventory_balance_org_branch_idx" ON "inventory_balance"("orgId", "branchId");

CREATE TABLE IF NOT EXISTS "inventory_cost_layer" (
  "id" text PRIMARY KEY, "productId" text NOT NULL REFERENCES "product"("id") ON DELETE restrict,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE restrict, "sourceType" text NOT NULL, "sourceId" text NOT NULL,
  "quantityReceived" numeric(16,3) NOT NULL, "quantityRemaining" numeric(16,3) NOT NULL,
  "unitCost" numeric(12,4) NOT NULL, "landedUnitCost" numeric(12,4) NOT NULL,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade, "receivedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_cost_layer_quantities" CHECK ("quantityReceived" > 0 AND "quantityRemaining" >= 0 AND "quantityRemaining" <= "quantityReceived")
);
CREATE INDEX IF NOT EXISTS "inventory_cost_layer_product_branch_idx" ON "inventory_cost_layer"("productId", "branchId", "receivedAt");

CREATE TABLE IF NOT EXISTS "product_packaging" (
  "id" text PRIMARY KEY, "productId" text NOT NULL REFERENCES "product"("id") ON DELETE cascade,
  "name" text NOT NULL, "barcode" text, "quantityInBaseUnit" numeric(16,3) NOT NULL,
  "purpose" text NOT NULL DEFAULT 'both', "isDefaultPurchase" boolean NOT NULL DEFAULT false,
  "isDefaultSale" boolean NOT NULL DEFAULT false, "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "product_packaging_positive" CHECK ("quantityInBaseUnit" > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_packaging_product_name_unique" ON "product_packaging"("productId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "product_packaging_org_barcode_unique" ON "product_packaging"("orgId", "barcode") WHERE "barcode" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "supplier_product" (
  "id" text PRIMARY KEY, "supplierId" text NOT NULL REFERENCES "supplier"("id") ON DELETE cascade,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE cascade, "supplierCode" text,
  "unitCost" numeric(12,4) NOT NULL DEFAULT 0, "minimumOrderQuantity" numeric(16,3) NOT NULL DEFAULT 1,
  "leadTimeDays" integer NOT NULL DEFAULT 0, "packSize" numeric(16,3) NOT NULL DEFAULT 1,
  "isPreferred" boolean NOT NULL DEFAULT false, "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "updatedAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "supplier_product_positive" CHECK ("minimumOrderQuantity" > 0 AND "packSize" > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_product_unique" ON "supplier_product"("supplierId", "productId");
CREATE INDEX IF NOT EXISTS "supplier_product_org_code_idx" ON "supplier_product"("orgId", "supplierCode");

CREATE TABLE IF NOT EXISTS "inventory_lot" (
  "id" text PRIMARY KEY, "productId" text NOT NULL REFERENCES "product"("id") ON DELETE restrict,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE restrict, "lotNumber" text NOT NULL,
  "quantity" numeric(16,3) NOT NULL DEFAULT 0, "receivedAt" timestamp NOT NULL DEFAULT now(), "manufacturedAt" timestamp,
  "bestBeforeAt" timestamp, "expiresAt" timestamp, "alertAt" timestamp, "status" text NOT NULL DEFAULT 'available',
  "supplierId" text REFERENCES "supplier"("id") ON DELETE set null, "unitCost" numeric(12,4) NOT NULL DEFAULT 0,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade, "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_lot_nonnegative" CHECK ("quantity" >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_lot_product_branch_number_unique" ON "inventory_lot"("productId", "branchId", "lotNumber");
CREATE INDEX IF NOT EXISTS "inventory_lot_org_expiry_idx" ON "inventory_lot"("orgId", "expiresAt");

CREATE TABLE IF NOT EXISTS "inventory_serial" (
  "id" text PRIMARY KEY, "productId" text NOT NULL REFERENCES "product"("id") ON DELETE restrict,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE restrict, "lotId" text REFERENCES "inventory_lot"("id") ON DELETE set null,
  "serialNumber" text NOT NULL, "status" text NOT NULL DEFAULT 'available', "warrantyEndsAt" timestamp,
  "soldAt" timestamp, "saleId" text, "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_serial_org_number_unique" ON "inventory_serial"("orgId", "serialNumber");
CREATE INDEX IF NOT EXISTS "inventory_serial_product_branch_idx" ON "inventory_serial"("productId", "branchId");

ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE restrict;
ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "supplierReference" text;
ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "discountAmount" numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "shippingAmount" numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "otherCosts" numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "sentAt" timestamp;
ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "confirmedAt" timestamp;
ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "closedAt" timestamp;
ALTER TABLE "purchase_order_item" ADD COLUMN IF NOT EXISTS "receivedQuantity" numeric(16,3) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_order_item" ADD COLUMN IF NOT EXISTS "rejectedQuantity" numeric(16,3) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_order_item" ADD COLUMN IF NOT EXISTS "packagingId" text REFERENCES "product_packaging"("id") ON DELETE set null;

CREATE TABLE IF NOT EXISTS "purchase_receipt" (
  "id" text PRIMARY KEY, "receiptNo" text NOT NULL, "poId" text NOT NULL REFERENCES "purchase_order"("id") ON DELETE restrict,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE restrict, "supplierInvoice" text, "idempotencyKey" text NOT NULL,
  "status" text NOT NULL DEFAULT 'received', "notes" text, "receivedBy" text NOT NULL,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_receipt_org_number_unique" ON "purchase_receipt"("orgId", "receiptNo");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_receipt_org_idempotency_unique" ON "purchase_receipt"("orgId", "idempotencyKey");
CREATE TABLE IF NOT EXISTS "purchase_receipt_item" (
  "id" text PRIMARY KEY, "receiptId" text NOT NULL REFERENCES "purchase_receipt"("id") ON DELETE cascade,
  "poItemId" text NOT NULL REFERENCES "purchase_order_item"("id") ON DELETE restrict,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE restrict,
  "acceptedQuantity" numeric(16,3) NOT NULL DEFAULT 0, "rejectedQuantity" numeric(16,3) NOT NULL DEFAULT 0,
  "rejectionReason" text, "baseQuantity" numeric(16,3) NOT NULL, "unitCost" numeric(12,4) NOT NULL,
  "lotNumber" text, "expiresAt" timestamp, "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE cascade
);

ALTER TABLE "inventory_transfer" ADD COLUMN IF NOT EXISTS "dispatchedBy" text;
ALTER TABLE "inventory_transfer" ADD COLUMN IF NOT EXISTS "receivedBy" text;
ALTER TABLE "inventory_transfer" ADD COLUMN IF NOT EXISTS "reference" text;
ALTER TABLE "inventory_transfer" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "inventory_transfer" ADD COLUMN IF NOT EXISTS "trackingNumber" text;
ALTER TABLE "inventory_transfer" ADD COLUMN IF NOT EXISTS "idempotencyKey" text;
ALTER TABLE "inventory_transfer" ADD COLUMN IF NOT EXISTS "dispatchedAt" timestamp;
ALTER TABLE "inventory_transfer" ADD COLUMN IF NOT EXISTS "receivedAt" timestamp;
ALTER TABLE "inventory_transfer" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();
ALTER TABLE "inventory_transfer_item" ADD COLUMN IF NOT EXISTS "dispatchedQuantity" numeric(16,3) NOT NULL DEFAULT 0;
ALTER TABLE "inventory_transfer_item" ADD COLUMN IF NOT EXISTS "receivedQuantity" numeric(16,3) NOT NULL DEFAULT 0;
ALTER TABLE "inventory_transfer_item" ADD COLUMN IF NOT EXISTS "rejectedQuantity" numeric(16,3) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_transfer_org_number_unique" ON "inventory_transfer"("orgId", "transferNo");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_transfer_org_idempotency_unique" ON "inventory_transfer"("orgId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "product_org_sku_unique" ON "product"("orgId", "sku") WHERE "sku" IS NOT NULL AND "isActive" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "product_org_barcode_unique" ON "product"("orgId", "barcode") WHERE "barcode" IS NOT NULL AND "isActive" = true;
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_order_org_number_unique" ON "purchase_order"("orgId", "poNo");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_adjustment_org_number_unique" ON "stock_adjustment"("orgId", "adjustmentNo");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movement_reference_unique" ON "stock_movement"("orgId", "referenceType", "referenceId", "productId", "type")
  WHERE "referenceType" IS NOT NULL AND "referenceId" IS NOT NULL AND "type" IN ('sale', 'return', 'opening_stock', 'purchase_receipt', 'transfer_dispatch', 'transfer_receipt');

-- Existing organization-wide stock is assigned to the main branch. Organizations
-- without a main flag use their oldest branch. The insert is safe to rerun.
INSERT INTO "inventory_balance" ("id", "productId", "branchId", "onHand", "reorderPoint", "orgId")
SELECT 'bal_' || md5(p.id || b.id), p.id, b.id, p.stock, p."minStock", p."orgId"
FROM product p
JOIN LATERAL (
  SELECT id FROM branch WHERE "organizationId" = p."orgId"
  ORDER BY "isMain" DESC, "createdAt" ASC LIMIT 1
) b ON true
ON CONFLICT ("productId", "branchId") DO NOTHING;

INSERT INTO "inventory_cost_layer" ("id", "productId", "branchId", "sourceType", "sourceId", "quantityReceived", "quantityRemaining", "unitCost", "landedUnitCost", "orgId", "receivedAt")
SELECT 'layer_' || md5(ib."productId" || ib."branchId"), ib."productId", ib."branchId", 'migration_opening', ib."productId",
       ib."onHand", ib."onHand", p."buyingPrice", p."buyingPrice", ib."orgId", now()
FROM "inventory_balance" ib JOIN product p ON p.id = ib."productId"
WHERE ib."onHand" > 0 AND NOT EXISTS (
  SELECT 1 FROM "inventory_cost_layer" l WHERE l."productId" = ib."productId" AND l."branchId" = ib."branchId"
);

UPDATE stock_movement sm SET "branchId" = (
  SELECT id FROM branch WHERE "organizationId" = sm."orgId"
  ORDER BY "isMain" DESC, "createdAt" ASC LIMIT 1
) WHERE sm."branchId" IS NULL;
