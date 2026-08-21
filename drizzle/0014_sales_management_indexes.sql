CREATE INDEX IF NOT EXISTS "sale_org_status_created_idx" ON "sale" ("orgId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_org_payment_created_idx" ON "sale" ("orgId", "paymentMethod", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_org_customer_created_idx" ON "sale" ("orgId", "customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_org_cashier_created_idx" ON "sale" ("orgId", "userId", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_org_branch_created_idx" ON "sale" ("orgId", "branchId", "createdAt");
CREATE INDEX IF NOT EXISTS "sale_payment_org_reference_idx" ON "sale_payment" ("orgId", "reference");
