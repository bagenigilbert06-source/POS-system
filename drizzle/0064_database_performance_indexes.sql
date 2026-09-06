-- Catch up performance indexes on installations where earlier schema indexes
-- were not deployed, and cover the hottest tenant-scoped dashboard/auth reads.
-- Every statement is idempotent so this migration is safe across mixed installs.
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "organization_membership_user_idx" ON "organization_membership" ("userId");
CREATE INDEX IF NOT EXISTS "branch_membership_user_idx" ON "branch_membership" ("userId");

CREATE INDEX IF NOT EXISTS "product_org_active_idx" ON "product" ("orgId", "isActive");
CREATE INDEX IF NOT EXISTS "customer_org_created_idx" ON "customer" ("orgId", "createdAt");

CREATE INDEX IF NOT EXISTS "sale_org_created_idx" ON "sale" ("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_org_status_created_idx" ON "sale" ("orgId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_org_payment_created_idx" ON "sale" ("orgId", "paymentMethod", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_org_customer_created_idx" ON "sale" ("orgId", "customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_org_cashier_created_idx" ON "sale" ("orgId", "userId", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_org_branch_created_idx" ON "sale" ("orgId", "branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_item_sale_org_idx" ON "sale_item" ("saleId", "orgId");
CREATE INDEX IF NOT EXISTS "sale_item_org_product_idx" ON "sale_item" ("orgId", "productId");

CREATE INDEX IF NOT EXISTS "expense_org_created_idx" ON "expense" ("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "expense_org_branch_created_idx" ON "expense" ("orgId", "branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "sales_return_org_status_created_idx" ON "sales_return" ("orgId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "sales_return_item_return_org_idx" ON "sales_return_item" ("returnId", "orgId");
CREATE INDEX IF NOT EXISTS "sales_return_item_org_product_idx" ON "sales_return_item" ("orgId", "productId");

CREATE INDEX IF NOT EXISTS "invoice_org_created_idx" ON "invoice" ("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "audit_event_org_created_idx" ON "audit_event" ("organizationId", "createdAt");
