-- Connect goods receipts, purchase history and supplier payments.
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "branchId" text REFERENCES "branch"("id") ON DELETE restrict;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "poId" text REFERENCES "purchase_order"("id") ON DELETE set null;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "receiptId" text REFERENCES "purchase_receipt"("id") ON DELETE set null;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "paidAmount" numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "dueDate" timestamp;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "paidAt" timestamp;
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_org_number_unique" ON "purchase"("orgId", "purchaseNo");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_receipt_link_unique" ON "purchase"("receiptId") WHERE "receiptId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "purchase_org_payment_idx" ON "purchase"("orgId", "paymentStatus", "dueDate");

UPDATE "purchase" SET "paidAmount" = "total", "paidAt" = COALESCE("paidAt", "createdAt") WHERE "paymentStatus" = 'paid' AND "paidAmount" = 0;
