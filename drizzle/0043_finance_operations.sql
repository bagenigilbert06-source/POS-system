CREATE TABLE "supplier_bill" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "branchId" text NOT NULL,
  "supplierId" text NOT NULL, "billNo" text NOT NULL, "supplierReference" text NOT NULL,
  "description" text, "subtotal" numeric(14,2) NOT NULL, "taxAmount" numeric(14,2) DEFAULT '0' NOT NULL,
  "total" numeric(14,2) NOT NULL, "amountPaid" numeric(14,2) DEFAULT '0' NOT NULL,
  "balanceDue" numeric(14,2) NOT NULL, "billDate" timestamp NOT NULL, "dueDate" timestamp NOT NULL,
  "status" text DEFAULT 'unpaid' NOT NULL, "notes" text, "idempotencyKey" text NOT NULL,
  "createdBy" text NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "supplier_bill_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "supplier_bill_branch_fk" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE restrict,
  CONSTRAINT "supplier_bill_supplier_fk" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE restrict,
  CONSTRAINT "supplier_bill_creator_fk" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_bill_org_number_unique" ON "supplier_bill" ("organizationId","billNo");
CREATE UNIQUE INDEX "supplier_bill_org_supplier_reference_unique" ON "supplier_bill" ("organizationId","supplierId","supplierReference");
CREATE UNIQUE INDEX "supplier_bill_org_idempotency_unique" ON "supplier_bill" ("organizationId","idempotencyKey");
CREATE INDEX "supplier_bill_org_status_due_idx" ON "supplier_bill" ("organizationId","status","dueDate");
CREATE INDEX "supplier_bill_branch_date_idx" ON "supplier_bill" ("branchId","billDate");
--> statement-breakpoint
CREATE TABLE "supplier_bill_item" (
  "id" text PRIMARY KEY NOT NULL, "billId" text NOT NULL, "description" text NOT NULL,
  "quantity" numeric(14,3) NOT NULL, "unitCost" numeric(14,4) NOT NULL,
  "taxAmount" numeric(14,2) DEFAULT '0' NOT NULL, "total" numeric(14,2) NOT NULL,
  CONSTRAINT "supplier_bill_item_bill_fk" FOREIGN KEY ("billId") REFERENCES "supplier_bill"("id") ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE "supplier_bill_stock_intake" (
  "billId" text NOT NULL, "stockIntakeId" text NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "supplier_bill_stock_bill_fk" FOREIGN KEY ("billId") REFERENCES "supplier_bill"("id") ON DELETE cascade,
  CONSTRAINT "supplier_bill_stock_intake_fk" FOREIGN KEY ("stockIntakeId") REFERENCES "stock_intake"("id") ON DELETE restrict
);
CREATE UNIQUE INDEX "supplier_bill_stock_intake_unique" ON "supplier_bill_stock_intake" ("billId","stockIntakeId");
--> statement-breakpoint
CREATE TABLE "financial_account" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "branchId" text, "name" text NOT NULL,
  "type" text NOT NULL, "provider" text, "maskedIdentifier" text, "isActive" boolean DEFAULT true NOT NULL,
  "reconciliationEnabled" boolean DEFAULT true NOT NULL, "createdBy" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "financial_account_organization_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "financial_account_branch_fk" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE restrict,
  CONSTRAINT "financial_account_creator_fk" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE restrict
);
CREATE UNIQUE INDEX "financial_account_org_name_unique" ON "financial_account" ("organizationId","name");
CREATE INDEX "financial_account_org_active_idx" ON "financial_account" ("organizationId","isActive");
--> statement-breakpoint
CREATE TABLE "supplier_bill_payment" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "branchId" text NOT NULL,
  "billId" text NOT NULL, "financialAccountId" text, "amount" numeric(14,2) NOT NULL,
  "method" text NOT NULL, "reference" text, "paidAt" timestamp NOT NULL,
  "idempotencyKey" text NOT NULL, "paidBy" text NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "supplier_bill_payment_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "supplier_bill_payment_branch_fk" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE restrict,
  CONSTRAINT "supplier_bill_payment_bill_fk" FOREIGN KEY ("billId") REFERENCES "supplier_bill"("id") ON DELETE restrict,
  CONSTRAINT "supplier_bill_payment_account_fk" FOREIGN KEY ("financialAccountId") REFERENCES "financial_account"("id") ON DELETE restrict,
  CONSTRAINT "supplier_bill_payment_actor_fk" FOREIGN KEY ("paidBy") REFERENCES "user"("id") ON DELETE restrict
);
CREATE UNIQUE INDEX "supplier_bill_payment_org_idempotency_unique" ON "supplier_bill_payment" ("organizationId","idempotencyKey");
CREATE INDEX "supplier_bill_payment_bill_date_idx" ON "supplier_bill_payment" ("billId","paidAt");
--> statement-breakpoint
CREATE TABLE "reconciliation_import" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "financialAccountId" text NOT NULL,
  "filename" text NOT NULL, "fileHash" text NOT NULL, "statementFrom" timestamp, "statementTo" timestamp,
  "rowCount" integer NOT NULL, "status" text DEFAULT 'imported' NOT NULL, "importedBy" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "reconciliation_import_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "reconciliation_import_account_fk" FOREIGN KEY ("financialAccountId") REFERENCES "financial_account"("id") ON DELETE restrict,
  CONSTRAINT "reconciliation_import_actor_fk" FOREIGN KEY ("importedBy") REFERENCES "user"("id") ON DELETE restrict
);
CREATE UNIQUE INDEX "reconciliation_import_org_hash_unique" ON "reconciliation_import" ("organizationId","fileHash");
--> statement-breakpoint
CREATE TABLE "external_financial_transaction" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "financialAccountId" text NOT NULL,
  "importId" text, "externalId" text NOT NULL, "transactionAt" timestamp NOT NULL,
  "amount" numeric(14,2) NOT NULL, "feeAmount" numeric(14,2) DEFAULT '0' NOT NULL,
  "direction" text NOT NULL, "description" text, "reference" text,
  "status" text DEFAULT 'unmatched' NOT NULL, "ignoredReason" text, "rowHash" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "external_financial_transaction_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "external_financial_transaction_account_fk" FOREIGN KEY ("financialAccountId") REFERENCES "financial_account"("id") ON DELETE restrict,
  CONSTRAINT "external_financial_transaction_import_fk" FOREIGN KEY ("importId") REFERENCES "reconciliation_import"("id") ON DELETE restrict
);
CREATE UNIQUE INDEX "external_financial_transaction_account_row_unique" ON "external_financial_transaction" ("financialAccountId","rowHash");
CREATE INDEX "external_financial_transaction_org_status_idx" ON "external_financial_transaction" ("organizationId","status","transactionAt");
--> statement-breakpoint
CREATE TABLE "reconciliation_match" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "externalTransactionId" text NOT NULL,
  "systemType" text NOT NULL, "systemId" text NOT NULL, "systemAmount" numeric(14,2) NOT NULL,
  "externalAmount" numeric(14,2) NOT NULL, "difference" numeric(14,2) NOT NULL, "status" text NOT NULL,
  "reason" text, "idempotencyKey" text NOT NULL, "matchedBy" text NOT NULL, "matchedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "reconciliation_match_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "reconciliation_match_external_fk" FOREIGN KEY ("externalTransactionId") REFERENCES "external_financial_transaction"("id") ON DELETE restrict,
  CONSTRAINT "reconciliation_match_actor_fk" FOREIGN KEY ("matchedBy") REFERENCES "user"("id") ON DELETE restrict
);
CREATE UNIQUE INDEX "reconciliation_match_external_unique" ON "reconciliation_match" ("externalTransactionId");
CREATE UNIQUE INDEX "reconciliation_match_org_idempotency_unique" ON "reconciliation_match" ("organizationId","idempotencyKey");
--> statement-breakpoint
CREATE TABLE "finance_approval_policy" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "actionType" text NOT NULL,
  "thresholdAmount" numeric(14,2) NOT NULL, "preventSelfApproval" boolean DEFAULT true NOT NULL,
  "isActive" boolean DEFAULT true NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "finance_approval_policy_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX "finance_approval_policy_org_action_unique" ON "finance_approval_policy" ("organizationId","actionType");
--> statement-breakpoint
CREATE TABLE "finance_approval" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "branchId" text, "actionType" text NOT NULL,
  "entityType" text NOT NULL, "entityId" text NOT NULL, "amount" numeric(14,2) NOT NULL,
  "reason" text NOT NULL, "status" text DEFAULT 'pending' NOT NULL, "requestedBy" text NOT NULL,
  "decidedBy" text, "decisionReason" text, "decidedAt" timestamp, "idempotencyKey" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL, "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "finance_approval_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "finance_approval_branch_fk" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE restrict,
  CONSTRAINT "finance_approval_requester_fk" FOREIGN KEY ("requestedBy") REFERENCES "user"("id") ON DELETE restrict,
  CONSTRAINT "finance_approval_decider_fk" FOREIGN KEY ("decidedBy") REFERENCES "user"("id") ON DELETE restrict
);
CREATE UNIQUE INDEX "finance_approval_org_idempotency_unique" ON "finance_approval" ("organizationId","idempotencyKey");
CREATE INDEX "finance_approval_org_status_idx" ON "finance_approval" ("organizationId","status","createdAt");
--> statement-breakpoint
CREATE TABLE "finance_document" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "entityType" text NOT NULL,
  "entityId" text NOT NULL, "filename" text NOT NULL, "storageUrl" text NOT NULL,
  "contentType" text NOT NULL, "sizeBytes" integer NOT NULL, "uploadedBy" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "finance_document_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "finance_document_actor_fk" FOREIGN KEY ("uploadedBy") REFERENCES "user"("id") ON DELETE restrict
);
CREATE INDEX "finance_document_org_entity_idx" ON "finance_document" ("organizationId","entityType","entityId");
--> statement-breakpoint
CREATE TABLE "finance_budget" (
  "id" text PRIMARY KEY NOT NULL, "organizationId" text NOT NULL, "branchId" text,
  "month" text NOT NULL, "expenseCategory" text NOT NULL, "amount" numeric(14,2) NOT NULL,
  "notes" text, "createdBy" text NOT NULL, "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "finance_budget_org_fk" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE cascade,
  CONSTRAINT "finance_budget_branch_fk" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE restrict,
  CONSTRAINT "finance_budget_actor_fk" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE restrict
);
CREATE UNIQUE INDEX "finance_budget_scope_unique" ON "finance_budget" ("organizationId","branchId","month","expenseCategory");
CREATE INDEX "finance_budget_org_month_idx" ON "finance_budget" ("organizationId","month");
