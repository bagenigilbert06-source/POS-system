-- Operational BOS tables referenced by dashboard actions and reports.
-- Additive/idempotent: no existing rows or tables are replaced.

CREATE TABLE IF NOT EXISTS "sale_payment" (
  "id" text PRIMARY KEY, "saleId" text NOT NULL REFERENCES "sale"("id") ON DELETE CASCADE,
  "method" text NOT NULL, "amount" numeric(12,2) NOT NULL, "reference" text,
  "status" text NOT NULL DEFAULT 'completed', "userId" text NOT NULL, "orgId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "sale_payment_org_idx" ON "sale_payment"("orgId");
CREATE INDEX IF NOT EXISTS "sale_payment_sale_idx" ON "sale_payment"("saleId");

CREATE TABLE IF NOT EXISTS "credit_sale" (
  "id" text PRIMARY KEY, "saleId" text NOT NULL REFERENCES "sale"("id") ON DELETE CASCADE,
  "customerId" text NOT NULL REFERENCES "customer"("id") ON DELETE RESTRICT,
  "amount" numeric(12,2) NOT NULL, "amountPaid" numeric(12,2) NOT NULL DEFAULT 0,
  "dueDate" timestamp, "status" text NOT NULL DEFAULT 'unpaid', "userId" text NOT NULL,
  "orgId" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "credit_sale_org_idx" ON "credit_sale"("orgId");
CREATE INDEX IF NOT EXISTS "credit_sale_customer_idx" ON "credit_sale"("customerId");

CREATE TABLE IF NOT EXISTS "credit_payment" (
  "id" text PRIMARY KEY, "creditSaleId" text NOT NULL REFERENCES "credit_sale"("id") ON DELETE CASCADE,
  "amount" numeric(12,2) NOT NULL, "method" text NOT NULL DEFAULT 'cash', "reference" text,
  "userId" text NOT NULL, "orgId" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "credit_payment_org_idx" ON "credit_payment"("orgId");

CREATE TABLE IF NOT EXISTS "stock_adjustment" (
  "id" text PRIMARY KEY, "adjustmentNo" text NOT NULL, "type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending', "notes" text, "approvedBy" text,
  "userId" text NOT NULL, "orgId" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "approvedAt" timestamp
);
CREATE INDEX IF NOT EXISTS "stock_adjustment_org_idx" ON "stock_adjustment"("orgId");
CREATE TABLE IF NOT EXISTS "stock_adjustment_item" (
  "id" text PRIMARY KEY, "adjustmentId" text NOT NULL REFERENCES "stock_adjustment"("id") ON DELETE CASCADE,
  "productId" text NOT NULL, "productName" text NOT NULL, "quantityBefore" integer NOT NULL,
  "quantityAfter" integer NOT NULL, "variance" integer NOT NULL, "orgId" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "customer_credit_limit" (
  "id" text PRIMARY KEY, "customerId" text NOT NULL REFERENCES "customer"("id") ON DELETE CASCADE,
  "creditLimit" numeric(12,2) NOT NULL DEFAULT 0, "currentBalance" numeric(12,2) NOT NULL DEFAULT 0,
  "approvedBy" text NOT NULL, "status" text NOT NULL DEFAULT 'active', "orgId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "customer_credit_limit_org_idx" ON "customer_credit_limit"("orgId");
CREATE INDEX IF NOT EXISTS "customer_credit_limit_customer_idx" ON "customer_credit_limit"("customerId");

CREATE TABLE IF NOT EXISTS "cashier_shift" (
  "id" text PRIMARY KEY, "shiftNo" text NOT NULL, "cashierId" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "sessionId" text NOT NULL REFERENCES "pos_session"("id") ON DELETE CASCADE, "startTime" timestamp NOT NULL,
  "endTime" timestamp, "openingCash" numeric(12,2) NOT NULL, "closingCash" numeric(12,2),
  "expectedCash" numeric(12,2), "variance" numeric(12,2), "status" text NOT NULL DEFAULT 'open', "orgId" text NOT NULL
);
CREATE INDEX IF NOT EXISTS "cashier_shift_org_idx" ON "cashier_shift"("orgId");
CREATE INDEX IF NOT EXISTS "cashier_shift_cashier_idx" ON "cashier_shift"("cashierId");

CREATE TABLE IF NOT EXISTS "gl_account" (
  "id" text PRIMARY KEY, "code" text NOT NULL, "name" text NOT NULL, "type" text NOT NULL, "category" text NOT NULL,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "gl_account_org_idx" ON "gl_account"("orgId");
CREATE UNIQUE INDEX IF NOT EXISTS "gl_account_org_code_unique" ON "gl_account"("orgId", "code");
CREATE TABLE IF NOT EXISTS "general_ledger" (
  "id" text PRIMARY KEY, "accountId" text NOT NULL REFERENCES "gl_account"("id") ON DELETE RESTRICT,
  "debit" numeric(12,2) NOT NULL DEFAULT 0, "credit" numeric(12,2) NOT NULL DEFAULT 0,
  "description" text, "referenceType" text, "referenceId" text, "date" timestamp NOT NULL DEFAULT now(),
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "general_ledger_org_idx" ON "general_ledger"("orgId");
CREATE INDEX IF NOT EXISTS "general_ledger_date_idx" ON "general_ledger"("date");
CREATE TABLE IF NOT EXISTS "financial_statement" (
  "id" text PRIMARY KEY, "type" text NOT NULL, "period" text NOT NULL, "data" json NOT NULL,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "financial_statement_org_idx" ON "financial_statement"("orgId");

CREATE TABLE IF NOT EXISTS "invoice" (
  "id" text PRIMARY KEY, "invoiceNo" text NOT NULL, "customerId" text REFERENCES "customer"("id") ON DELETE SET NULL,
  "subtotal" numeric(12,2) NOT NULL DEFAULT 0, "taxAmount" numeric(12,2) NOT NULL DEFAULT 0, "total" numeric(12,2) NOT NULL,
  "dueDate" timestamp, "status" text NOT NULL DEFAULT 'draft', "notes" text,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE, "userId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "invoice_org_idx" ON "invoice"("orgId");
CREATE TABLE IF NOT EXISTS "invoice_item" (
  "id" text PRIMARY KEY, "invoiceId" text NOT NULL REFERENCES "invoice"("id") ON DELETE CASCADE,
  "description" text NOT NULL, "quantity" integer NOT NULL, "unitPrice" numeric(12,2) NOT NULL,
  "total" numeric(12,2) NOT NULL, "orgId" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "quotation" (
  "id" text PRIMARY KEY, "quoteNo" text NOT NULL, "customerId" text REFERENCES "customer"("id") ON DELETE SET NULL,
  "subtotal" numeric(12,2) NOT NULL DEFAULT 0, "taxAmount" numeric(12,2) NOT NULL DEFAULT 0, "total" numeric(12,2) NOT NULL,
  "validUntil" timestamp, "status" text NOT NULL DEFAULT 'draft', "notes" text,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE, "userId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "quotation_org_idx" ON "quotation"("orgId");
CREATE TABLE IF NOT EXISTS "quotation_item" (
  "id" text PRIMARY KEY, "quotationId" text NOT NULL REFERENCES "quotation"("id") ON DELETE CASCADE,
  "description" text NOT NULL, "quantity" integer NOT NULL, "unitPrice" numeric(12,2) NOT NULL,
  "total" numeric(12,2) NOT NULL, "orgId" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "purchase_order" (
  "id" text PRIMARY KEY, "poNo" text NOT NULL, "supplierId" text NOT NULL REFERENCES "supplier"("id") ON DELETE RESTRICT,
  "subtotal" numeric(12,2) NOT NULL DEFAULT 0, "taxAmount" numeric(12,2) NOT NULL DEFAULT 0, "total" numeric(12,2) NOT NULL,
  "status" text NOT NULL DEFAULT 'draft', "expectedDelivery" timestamp, "notes" text,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE, "userId" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "purchase_order_org_idx" ON "purchase_order"("orgId");
CREATE TABLE IF NOT EXISTS "purchase_order_item" (
  "id" text PRIMARY KEY, "poId" text NOT NULL REFERENCES "purchase_order"("id") ON DELETE CASCADE,
  "productId" text, "description" text NOT NULL, "quantity" integer NOT NULL, "unitPrice" numeric(12,2) NOT NULL,
  "total" numeric(12,2) NOT NULL, "orgId" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "inventory_transfer" (
  "id" text PRIMARY KEY, "transferNo" text NOT NULL, "fromLocation" text NOT NULL, "toLocation" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending', "userId" text NOT NULL, "approvedBy" text,
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(), "approvedAt" timestamp
);
CREATE INDEX IF NOT EXISTS "inventory_transfer_org_idx" ON "inventory_transfer"("orgId");
CREATE TABLE IF NOT EXISTS "inventory_transfer_item" (
  "id" text PRIMARY KEY, "transferId" text NOT NULL REFERENCES "inventory_transfer"("id") ON DELETE CASCADE,
  "productId" text NOT NULL, "productName" text NOT NULL, "quantity" integer NOT NULL, "orgId" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "task" (
  "id" text PRIMARY KEY, "title" text NOT NULL, "description" text, "status" text NOT NULL DEFAULT 'pending',
  "priority" text NOT NULL DEFAULT 'medium', "assigneeId" text REFERENCES "employee"("id") ON DELETE SET NULL,
  "dueDate" timestamp, "completedAt" timestamp, "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "createdBy" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "task_org_idx" ON "task"("orgId");
CREATE TABLE IF NOT EXISTS "performance_goal" (
  "id" text PRIMARY KEY, "employeeId" text NOT NULL REFERENCES "employee"("id") ON DELETE CASCADE,
  "title" text NOT NULL, "target" numeric(12,2) NOT NULL, "achieved" numeric(12,2) NOT NULL DEFAULT 0,
  "period" text NOT NULL, "status" text NOT NULL DEFAULT 'in_progress',
  "orgId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE, "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "performance_goal_org_idx" ON "performance_goal"("orgId");
