CREATE TABLE IF NOT EXISTS "cafe_configuration" (
  "organizationId" text PRIMARY KEY REFERENCES "organization"("id") ON DELETE CASCADE,
  "enabledOrderTypes" json NOT NULL DEFAULT '["takeaway"]'::json,
  "defaultOrderType" text NOT NULL DEFAULT 'takeaway',
  "tablesEnabled" boolean NOT NULL DEFAULT false,
  "preparationEnabled" boolean NOT NULL DEFAULT false,
  "stationsEnabled" boolean NOT NULL DEFAULT false,
  "tipsEnabled" boolean NOT NULL DEFAULT false,
  "kitchenPrintingEnabled" boolean NOT NULL DEFAULT false,
  "updatedBy" text REFERENCES "user"("id") ON DELETE SET NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cafe_preparation_station" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text REFERENCES "branch"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "printerIdentifier" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "cafe_station_org_branch_name_unique" ON "cafe_preparation_station" ("organizationId", "branchId", "name");
CREATE INDEX IF NOT EXISTS "cafe_station_org_active_idx" ON "cafe_preparation_station" ("organizationId", "isActive");

CREATE TABLE IF NOT EXISTS "cafe_menu_item" (
  "productId" text PRIMARY KEY REFERENCES "product"("id") ON DELETE CASCADE,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "inventoryMode" text NOT NULL DEFAULT 'product',
  "preparationRequired" boolean NOT NULL DEFAULT false,
  "stationId" text REFERENCES "cafe_preparation_station"("id") ON DELETE SET NULL,
  "manualAvailability" text NOT NULL DEFAULT 'available',
  "availabilityReason" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "cafe_menu_item_org_idx" ON "cafe_menu_item" ("organizationId");

CREATE TABLE IF NOT EXISTS "cafe_modifier_group" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "selectionType" text NOT NULL DEFAULT 'single',
  "minimumSelections" integer NOT NULL DEFAULT 0,
  "maximumSelections" integer NOT NULL DEFAULT 1,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "cafe_modifier_group_org_idx" ON "cafe_modifier_group" ("organizationId", "isActive");

CREATE TABLE IF NOT EXISTS "cafe_modifier_option" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "groupId" text NOT NULL REFERENCES "cafe_modifier_group"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "priceAdjustment" numeric(12,2) NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "cafe_modifier_option_group_idx" ON "cafe_modifier_option" ("groupId", "isActive");

CREATE TABLE IF NOT EXISTS "cafe_menu_item_modifier_group" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "groupId" text NOT NULL REFERENCES "cafe_modifier_group"("id") ON DELETE CASCADE,
  "sortOrder" integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "cafe_menu_item_modifier_unique" ON "cafe_menu_item_modifier_group" ("productId", "groupId");
CREATE INDEX IF NOT EXISTS "cafe_menu_item_modifier_org_product_idx" ON "cafe_menu_item_modifier_group" ("organizationId", "productId");

CREATE TABLE IF NOT EXISTS "cafe_recipe_component" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "menuProductId" text NOT NULL REFERENCES "product"("id") ON DELETE CASCADE,
  "packageId" text REFERENCES "product_package"("id") ON DELETE CASCADE,
  "modifierOptionId" text REFERENCES "cafe_modifier_option"("id") ON DELETE CASCADE,
  "ingredientProductId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "quantityBase" numeric(16,3) NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "cafe_recipe_scope_check" CHECK (NOT ("packageId" IS NOT NULL AND "modifierOptionId" IS NOT NULL)),
  CONSTRAINT "cafe_recipe_quantity_check" CHECK ("quantityBase" > 0)
);
CREATE INDEX IF NOT EXISTS "cafe_recipe_menu_idx" ON "cafe_recipe_component" ("organizationId", "menuProductId");
CREATE INDEX IF NOT EXISTS "cafe_recipe_ingredient_idx" ON "cafe_recipe_component" ("organizationId", "ingredientProductId");

CREATE TABLE IF NOT EXISTS "cafe_table" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'available',
  "isActive" boolean NOT NULL DEFAULT true,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "cafe_table_branch_name_unique" ON "cafe_table" ("branchId", "name");
CREATE INDEX IF NOT EXISTS "cafe_table_branch_status_idx" ON "cafe_table" ("organizationId", "branchId", "status");

CREATE TABLE IF NOT EXISTS "cafe_order_sequence" (
  "organizationId" text PRIMARY KEY REFERENCES "organization"("id") ON DELETE CASCADE,
  "lastNumber" integer NOT NULL DEFAULT 1000,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cafe_order" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "saleId" text REFERENCES "sale"("id") ON DELETE RESTRICT,
  "orderNumber" integer NOT NULL,
  "orderType" text NOT NULL DEFAULT 'takeaway',
  "tableId" text REFERENCES "cafe_table"("id") ON DELETE RESTRICT,
  "guestId" text REFERENCES "customer"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'paid',
  "preparationStatus" text NOT NULL DEFAULT 'completed',
  "notes" text,
  "idempotencyKey" text NOT NULL,
  "createdBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "completedAt" timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS "cafe_order_org_number_unique" ON "cafe_order" ("organizationId", "orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "cafe_order_sale_unique" ON "cafe_order" ("saleId");
CREATE UNIQUE INDEX IF NOT EXISTS "cafe_order_org_idempotency_unique" ON "cafe_order" ("organizationId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "cafe_order_branch_queue_idx" ON "cafe_order" ("organizationId", "branchId", "preparationStatus", "createdAt");

CREATE TABLE IF NOT EXISTS "cafe_order_line" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "orderId" text NOT NULL REFERENCES "cafe_order"("id") ON DELETE CASCADE,
  "saleItemId" text REFERENCES "sale_item"("id") ON DELETE RESTRICT,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "packageId" text REFERENCES "product_package"("id") ON DELETE RESTRICT,
  "itemName" text NOT NULL,
  "sizeName" text,
  "quantity" integer NOT NULL,
  "unitPrice" numeric(12,2) NOT NULL,
  "totalPrice" numeric(12,2) NOT NULL,
  "preparationRequired" boolean NOT NULL DEFAULT false,
  "stationId" text REFERENCES "cafe_preparation_station"("id") ON DELETE SET NULL,
  "preparationStatus" text NOT NULL DEFAULT 'completed',
  "notes" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "cafe_order_line_order_idx" ON "cafe_order_line" ("organizationId", "orderId");

CREATE TABLE IF NOT EXISTS "cafe_order_line_modifier" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "orderLineId" text NOT NULL REFERENCES "cafe_order_line"("id") ON DELETE CASCADE,
  "modifierGroupId" text NOT NULL REFERENCES "cafe_modifier_group"("id") ON DELETE RESTRICT,
  "modifierOptionId" text NOT NULL REFERENCES "cafe_modifier_option"("id") ON DELETE RESTRICT,
  "groupName" text NOT NULL,
  "optionName" text NOT NULL,
  "priceAdjustment" numeric(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "cafe_order_line_modifier_line_idx" ON "cafe_order_line_modifier" ("organizationId", "orderLineId");

CREATE TABLE IF NOT EXISTS "cafe_preparation_event" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "orderId" text NOT NULL REFERENCES "cafe_order"("id") ON DELETE CASCADE,
  "fromStatus" text,
  "toStatus" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "cafe_preparation_event_order_idx" ON "cafe_preparation_event" ("organizationId", "orderId", "createdAt");

CREATE TABLE IF NOT EXISTS "cafe_wastage" (
  "id" text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE RESTRICT,
  "inventoryLossId" text NOT NULL REFERENCES "inventory_loss"("id") ON DELETE RESTRICT,
  "productId" text NOT NULL REFERENCES "product"("id") ON DELETE RESTRICT,
  "quantityBase" numeric(16,3) NOT NULL,
  "enteredQuantity" numeric(16,3) NOT NULL,
  "enteredUnit" text NOT NULL,
  "reasonType" text NOT NULL,
  "notes" text,
  "recordedBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "approvedBy" text REFERENCES "user"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "cafe_wastage_loss_unique" ON "cafe_wastage" ("inventoryLossId");
CREATE INDEX IF NOT EXISTS "cafe_wastage_branch_created_idx" ON "cafe_wastage" ("organizationId", "branchId", "createdAt");
