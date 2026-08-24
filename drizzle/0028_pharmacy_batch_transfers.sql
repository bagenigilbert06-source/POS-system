CREATE TABLE IF NOT EXISTS "inventory_transfer_lot_allocation" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "transferId" text NOT NULL REFERENCES "inventory_transfer"("id") ON DELETE CASCADE,
  "transferItemId" text NOT NULL REFERENCES "inventory_transfer_item"("id") ON DELETE CASCADE,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "sourceLotId" text NOT NULL REFERENCES "inventory_lot"("id") ON DELETE RESTRICT,
  "lotNumber" text NOT NULL,
  "manufacturedAt" timestamp,
  "bestBeforeAt" timestamp,
  "expiresAt" timestamp,
  "alertAt" timestamp,
  "supplierId" text REFERENCES "supplier"("id") ON DELETE SET NULL,
  "unitCost" numeric(12,4) NOT NULL DEFAULT 0,
  "dispatchedQuantity" numeric(16,3) NOT NULL CHECK ("dispatchedQuantity" > 0),
  "receivedQuantity" numeric(16,3) NOT NULL DEFAULT 0 CHECK ("receivedQuantity" >= 0),
  "rejectedQuantity" numeric(16,3) NOT NULL DEFAULT 0 CHECK ("rejectedQuantity" >= 0),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_transfer_lot_quantities_check" CHECK ("receivedQuantity" + "rejectedQuantity" <= "dispatchedQuantity")
);
CREATE INDEX IF NOT EXISTS "inventory_transfer_lot_item_idx" ON "inventory_transfer_lot_allocation" ("transferItemId");
CREATE INDEX IF NOT EXISTS "inventory_transfer_lot_org_transfer_idx" ON "inventory_transfer_lot_allocation" ("organizationId", "transferId");
