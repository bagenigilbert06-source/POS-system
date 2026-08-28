CREATE TABLE "stock_intake" (
  "id" text PRIMARY KEY NOT NULL,
  "intakeNo" text NOT NULL,
  "externalReference" text,
  "sourceName" text,
  "sourceType" text NOT NULL DEFAULT 'new_stock',
  "notes" text,
  "status" text NOT NULL DEFAULT 'confirmed',
  "receivedAt" timestamp NOT NULL,
  "createdBy" text NOT NULL,
  "confirmedBy" text NOT NULL,
  "confirmedAt" timestamp NOT NULL DEFAULT now(),
  "idempotencyKey" text NOT NULL,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_intake_item" (
  "id" text PRIMARY KEY NOT NULL,
  "intakeId" text NOT NULL REFERENCES "stock_intake"("id") ON DELETE RESTRICT,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "productName" text NOT NULL,
  "sku" text,
  "packageId" text REFERENCES "product_package"("id") ON DELETE RESTRICT,
  "enteredQuantity" integer NOT NULL,
  "enteredUnit" text NOT NULL,
  "baseQuantity" integer NOT NULL,
  "unitCost" numeric(12, 4) NOT NULL,
  "totalCost" numeric(12, 2) NOT NULL,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE "stock_intake"
  ADD CONSTRAINT "stock_intake_status_check"
    CHECK ("status" IN ('confirmed', 'reversed')),
  ADD CONSTRAINT "stock_intake_source_type_check"
    CHECK ("sourceType" IN ('new_stock', 'opening_stock', 'other'));
--> statement-breakpoint
ALTER TABLE "stock_intake_item"
  ADD CONSTRAINT "stock_intake_item_entered_quantity_check"
    CHECK ("enteredQuantity" > 0),
  ADD CONSTRAINT "stock_intake_item_base_quantity_check"
    CHECK ("baseQuantity" > 0),
  ADD CONSTRAINT "stock_intake_item_cost_check"
    CHECK ("unitCost" >= 0 AND "totalCost" >= 0);
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_intake_org_number_unique" ON "stock_intake" ("orgId", "intakeNo");
--> statement-breakpoint
CREATE UNIQUE INDEX "stock_intake_org_idempotency_unique" ON "stock_intake" ("orgId", "idempotencyKey");
--> statement-breakpoint
CREATE INDEX "stock_intake_org_received_idx" ON "stock_intake" ("orgId", "receivedAt");
