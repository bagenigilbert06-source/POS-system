CREATE INDEX IF NOT EXISTS "sale_org_idx" ON "sale" ("orgId");
CREATE INDEX IF NOT EXISTS "sale_org_created_idx" ON "sale" ("orgId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "sale_org_idempotency_unique" ON "sale" ("orgId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "sale_org_receipt_unique" ON "sale" ("orgId", "receiptNo");
CREATE INDEX IF NOT EXISTS "sale_item_sale_org_idx" ON "sale_item" ("saleId", "orgId");
CREATE INDEX IF NOT EXISTS "product_org_active_idx" ON "product" ("orgId", "isActive");
CREATE INDEX IF NOT EXISTS "pos_session_operator_status_idx" ON "pos_session" ("orgId", "openedBy", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "pos_session_one_open_per_operator" ON "pos_session" ("orgId", "openedBy") WHERE "status" = 'open';
