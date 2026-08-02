CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"action" text NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"region" text,
	"city" text,
	"timezone" text DEFAULT 'Africa/Nairobi' NOT NULL,
	"receiptHeader" text,
	"isMain" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"branchId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"organizationId" text PRIMARY KEY NOT NULL,
	"displayName" text,
	"website" text,
	"region" text,
	"city" text,
	"address" text,
	"language" text DEFAULT 'en' NOT NULL,
	"financialYearStart" text,
	"customBusinessCategory" text,
	"operations" json DEFAULT '{}'::json NOT NULL,
	"enabledModules" json DEFAULT '[]'::json NOT NULL,
	"paymentMethods" json DEFAULT '[]'::json NOT NULL,
	"defaultPaymentMethod" text,
	"taxEnabled" boolean DEFAULT false NOT NULL,
	"pricesIncludeTax" boolean DEFAULT false NOT NULL,
	"taxName" text,
	"taxRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"taxIdentifier" text,
	"receiptBusinessName" text,
	"receiptPhone" text,
	"receiptAddress" text,
	"receiptFooter" text,
	"showTaxOnReceipt" boolean DEFAULT false NOT NULL,
	"receiptShowPhone" boolean DEFAULT true NOT NULL,
	"receiptShowAddress" boolean DEFAULT true NOT NULL,
	"receiptShowCashier" boolean DEFAULT true NOT NULL,
	"receiptShowCustomer" boolean DEFAULT true NOT NULL,
	"receiptShowPayment" boolean DEFAULT true NOT NULL,
	"receiptShowQrCode" boolean DEFAULT false NOT NULL,
	"receiptShowItemSku" boolean DEFAULT false NOT NULL,
	"receiptNumbering" text DEFAULT 'automatic' NOT NULL,
	"checklistDismissed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashier_shift" (
	"id" text PRIMARY KEY NOT NULL,
	"shiftNo" text NOT NULL,
	"cashierId" text NOT NULL,
	"sessionId" text NOT NULL,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp,
	"openingCash" numeric(12, 2) NOT NULL,
	"closingCash" numeric(12, 2),
	"expectedCash" numeric(12, 2),
	"variance" numeric(12, 2),
	"status" text DEFAULT 'open' NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"creditSaleId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"reference" text,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_sale" (
	"id" text PRIMARY KEY NOT NULL,
	"saleId" text NOT NULL,
	"customerId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"amountPaid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"dueDate" timestamp,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"loyaltyPoints" integer DEFAULT 0 NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_credit_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"customerId" text NOT NULL,
	"creditLimit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currentBalance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"approvedBy" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text DEFAULT 'staff' NOT NULL,
	"department" text,
	"salary" numeric(12, 2) DEFAULT '0' NOT NULL,
	"joinDate" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_commission" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"notes" text,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_statement" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"period" text NOT NULL,
	"data" json NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "general_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"debit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"credit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"referenceType" text,
	"referenceId" text,
	"date" timestamp DEFAULT now() NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gl_account" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_loss" (
	"id" text PRIMARY KEY NOT NULL,
	"lossNo" text NOT NULL,
	"productId" text NOT NULL,
	"productName" text NOT NULL,
	"quantity" integer NOT NULL,
	"type" text NOT NULL,
	"unitCost" numeric(12, 2) NOT NULL,
	"totalCost" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transfer" (
	"id" text PRIMARY KEY NOT NULL,
	"transferNo" text NOT NULL,
	"fromLocation" text NOT NULL,
	"toLocation" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"userId" text NOT NULL,
	"approvedBy" text,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"approvedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "inventory_transfer_item" (
	"id" text PRIMARY KEY NOT NULL,
	"transferId" text NOT NULL,
	"productId" text NOT NULL,
	"productName" text NOT NULL,
	"quantity" integer NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceNo" text NOT NULL,
	"customerId" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"dueDate" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"orgId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_item" (
	"id" text PRIMARY KEY NOT NULL,
	"invoiceId" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"publicKey" text NOT NULL,
	"privateKey" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "onboarding_state" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"organizationId" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"currentStep" text DEFAULT 'welcome' NOT NULL,
	"completedSteps" json DEFAULT '[]'::json NOT NULL,
	"data" json DEFAULT '{}'::json NOT NULL,
	"configurationVersion" integer DEFAULT 1 NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"lastSavedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	CONSTRAINT "onboarding_state_userId_unique" UNIQUE("userId"),
	CONSTRAINT "onboarding_state_organizationId_unique" UNIQUE("organizationId")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"businessType" text DEFAULT 'retail' NOT NULL,
	"businessCategory" text DEFAULT 'other_retail',
	"currency" text DEFAULT 'KES' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '16' NOT NULL,
	"userId" text NOT NULL,
	"onboardingCompleted" boolean DEFAULT false NOT NULL,
	"onboardingStep" integer DEFAULT 0 NOT NULL,
	"businessEmail" text,
	"country" text,
	"timezone" text DEFAULT 'Africa/Nairobi',
	"businessSize" text,
	"businessDescription" text,
	"phone" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organization_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_goal" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"title" text NOT NULL,
	"target" numeric(12, 2) NOT NULL,
	"achieved" numeric(12, 2) DEFAULT '0' NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_session" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionNo" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"openingCash" numeric(12, 2) DEFAULT '0' NOT NULL,
	"expectedCash" numeric(12, 2),
	"closingCash" numeric(12, 2),
	"variance" numeric(12, 2),
	"notes" text,
	"openedBy" text NOT NULL,
	"closedBy" text,
	"orgId" text NOT NULL,
	"openedAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"barcode" text,
	"description" text,
	"categoryId" text,
	"buyingPrice" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sellingPrice" numeric(12, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"minStock" integer DEFAULT 5 NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"imageUrl" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"purchaseNo" text NOT NULL,
	"supplierId" text,
	"supplierName" text NOT NULL,
	"reference" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"paymentStatus" text DEFAULT 'unpaid' NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"notes" text,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_item" (
	"id" text PRIMARY KEY NOT NULL,
	"purchaseId" text NOT NULL,
	"productId" text NOT NULL,
	"productName" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitCost" numeric(12, 2) NOT NULL,
	"totalCost" numeric(12, 2) NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order" (
	"id" text PRIMARY KEY NOT NULL,
	"poNo" text NOT NULL,
	"supplierId" text NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"expectedDelivery" timestamp,
	"notes" text,
	"orgId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_item" (
	"id" text PRIMARY KEY NOT NULL,
	"poId" text NOT NULL,
	"productId" text,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation" (
	"id" text PRIMARY KEY NOT NULL,
	"quoteNo" text NOT NULL,
	"customerId" text,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"validUntil" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"orgId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_item" (
	"id" text PRIMARY KEY NOT NULL,
	"quotationId" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale" (
	"id" text PRIMARY KEY NOT NULL,
	"receiptNo" text NOT NULL,
	"customerId" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"taxAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"amountReceived" numeric(12, 2),
	"change" numeric(12, 2),
	"paymentMethod" text DEFAULT 'cash' NOT NULL,
	"mpesaRef" text,
	"ageVerified" boolean DEFAULT false NOT NULL,
	"ageVerifiedAt" timestamp,
	"ageVerifiedBy" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"idempotencyKey" text,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_item" (
	"id" text PRIMARY KEY NOT NULL,
	"saleId" text NOT NULL,
	"productId" text NOT NULL,
	"productName" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(12, 2) NOT NULL,
	"totalPrice" numeric(12, 2) NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"saleId" text NOT NULL,
	"method" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reference" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_return" (
	"id" text PRIMARY KEY NOT NULL,
	"returnNo" text NOT NULL,
	"saleId" text NOT NULL,
	"receiptNo" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"refundMethod" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_return_item" (
	"id" text PRIMARY KEY NOT NULL,
	"returnId" text NOT NULL,
	"productId" text NOT NULL,
	"productName" text NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"disposition" text DEFAULT 'restock' NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shift" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"startTime" text NOT NULL,
	"endTime" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"employeeId" text NOT NULL,
	"shiftId" text NOT NULL,
	"date" timestamp NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_adjustment" (
	"id" text PRIMARY KEY NOT NULL,
	"adjustmentNo" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"approvedBy" text,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"approvedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "stock_adjustment_item" (
	"id" text PRIMARY KEY NOT NULL,
	"adjustmentId" text NOT NULL,
	"productId" text NOT NULL,
	"productName" text NOT NULL,
	"quantityBefore" integer NOT NULL,
	"quantityAfter" integer NOT NULL,
	"variance" integer NOT NULL,
	"orgId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"productId" text NOT NULL,
	"productName" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"stockBefore" integer NOT NULL,
	"stockAfter" integer NOT NULL,
	"referenceType" text,
	"referenceId" text,
	"reason" text,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"taxId" text,
	"address" text,
	"status" text DEFAULT 'active' NOT NULL,
	"userId" text NOT NULL,
	"orgId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigneeId" text,
	"dueDate" timestamp,
	"completedAt" timestamp,
	"orgId" text NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"status" text DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"config" json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_organizationId_unique" UNIQUE("organizationId")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch" ADD CONSTRAINT "branch_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_membership" ADD CONSTRAINT "branch_membership_branchId_branch_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_membership" ADD CONSTRAINT "branch_membership_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movement" ADD CONSTRAINT "cash_movement_sessionId_pos_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."pos_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shift" ADD CONSTRAINT "cashier_shift_cashierId_user_id_fk" FOREIGN KEY ("cashierId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shift" ADD CONSTRAINT "cashier_shift_sessionId_pos_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."pos_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_payment" ADD CONSTRAINT "credit_payment_creditSaleId_credit_sale_id_fk" FOREIGN KEY ("creditSaleId") REFERENCES "public"."credit_sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_sale" ADD CONSTRAINT "credit_sale_saleId_sale_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_sale" ADD CONSTRAINT "credit_sale_customerId_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_credit_limit" ADD CONSTRAINT "customer_credit_limit_customerId_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee" ADD CONSTRAINT "employee_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_commission" ADD CONSTRAINT "employee_commission_employeeId_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_commission" ADD CONSTRAINT "employee_commission_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_statement" ADD CONSTRAINT "financial_statement_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledger" ADD CONSTRAINT "general_ledger_accountId_gl_account_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."gl_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledger" ADD CONSTRAINT "general_ledger_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gl_account" ADD CONSTRAINT "gl_account_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfer" ADD CONSTRAINT "inventory_transfer_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfer_item" ADD CONSTRAINT "inventory_transfer_item_transferId_inventory_transfer_id_fk" FOREIGN KEY ("transferId") REFERENCES "public"."inventory_transfer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customerId_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoiceId_invoice_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_state" ADD CONSTRAINT "onboarding_state_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_state" ADD CONSTRAINT "onboarding_state_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership" ADD CONSTRAINT "organization_membership_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership" ADD CONSTRAINT "organization_membership_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal" ADD CONSTRAINT "performance_goal_employeeId_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal" ADD CONSTRAINT "performance_goal_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_supplierId_supplier_id_fk" FOREIGN KEY ("supplierId") REFERENCES "public"."supplier"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_purchaseId_purchase_id_fk" FOREIGN KEY ("purchaseId") REFERENCES "public"."purchase"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_supplierId_supplier_id_fk" FOREIGN KEY ("supplierId") REFERENCES "public"."supplier"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_item" ADD CONSTRAINT "purchase_order_item_poId_purchase_order_id_fk" FOREIGN KEY ("poId") REFERENCES "public"."purchase_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_customerId_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation" ADD CONSTRAINT "quotation_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item" ADD CONSTRAINT "quotation_item_quotationId_quotation_id_fk" FOREIGN KEY ("quotationId") REFERENCES "public"."quotation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payment" ADD CONSTRAINT "sale_payment_saleId_sale_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."sale"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_item" ADD CONSTRAINT "sales_return_item_returnId_sales_return_id_fk" FOREIGN KEY ("returnId") REFERENCES "public"."sales_return"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignment" ADD CONSTRAINT "shift_assignment_employeeId_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignment" ADD CONSTRAINT "shift_assignment_shiftId_shift_id_fk" FOREIGN KEY ("shiftId") REFERENCES "public"."shift"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_assignment" ADD CONSTRAINT "shift_assignment_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_item" ADD CONSTRAINT "stock_adjustment_item_adjustmentId_stock_adjustment_id_fk" FOREIGN KEY ("adjustmentId") REFERENCES "public"."stock_adjustment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assigneeId_employee_id_fk" FOREIGN KEY ("assigneeId") REFERENCES "public"."employee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_orgId_organization_id_fk" FOREIGN KEY ("orgId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_event_organization_idx" ON "audit_event" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_org_code_unique" ON "branch" USING btree ("organizationId","code");--> statement-breakpoint
CREATE INDEX "branch_organization_idx" ON "branch" USING btree ("organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_membership_branch_user_unique" ON "branch_membership" USING btree ("branchId","userId");--> statement-breakpoint
CREATE INDEX "cashier_shift_org_idx" ON "cashier_shift" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "cashier_shift_cashier_idx" ON "cashier_shift" USING btree ("cashierId");--> statement-breakpoint
CREATE INDEX "credit_payment_org_idx" ON "credit_payment" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "credit_sale_org_idx" ON "credit_sale" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "credit_sale_customer_idx" ON "credit_sale" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "customer_credit_limit_org_idx" ON "customer_credit_limit" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "customer_credit_limit_customer_idx" ON "customer_credit_limit" USING btree ("customerId");--> statement-breakpoint
CREATE INDEX "employee_org_idx" ON "employee" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "employee_commission_org_idx" ON "employee_commission" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "financial_statement_org_idx" ON "financial_statement" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "general_ledger_org_idx" ON "general_ledger" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "general_ledger_date_idx" ON "general_ledger" USING btree ("date");--> statement-breakpoint
CREATE INDEX "gl_account_org_idx" ON "gl_account" USING btree ("orgId");--> statement-breakpoint
CREATE UNIQUE INDEX "gl_account_org_code_unique" ON "gl_account" USING btree ("orgId","code");--> statement-breakpoint
CREATE INDEX "inventory_loss_org_idx" ON "inventory_loss" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "inventory_transfer_org_idx" ON "inventory_transfer" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "invoice_org_idx" ON "invoice" USING btree ("orgId");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_membership_org_user_unique" ON "organization_membership" USING btree ("organizationId","userId");--> statement-breakpoint
CREATE INDEX "performance_goal_org_idx" ON "performance_goal" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "pos_session_org_idx" ON "pos_session" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "purchase_org_idx" ON "purchase" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "purchase_order_org_idx" ON "purchase_order" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "quotation_org_idx" ON "quotation" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "sale_payment_org_idx" ON "sale_payment" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "sale_payment_sale_idx" ON "sale_payment" USING btree ("saleId");--> statement-breakpoint
CREATE INDEX "sales_return_org_idx" ON "sales_return" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "shift_org_idx" ON "shift" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "shift_assignment_org_idx" ON "shift_assignment" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "shift_assignment_employee_idx" ON "shift_assignment" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "stock_adjustment_org_idx" ON "stock_adjustment" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "stock_movement_org_idx" ON "stock_movement" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "stock_movement_product_idx" ON "stock_movement" USING btree ("productId");--> statement-breakpoint
CREATE INDEX "supplier_org_idx" ON "supplier" USING btree ("orgId");--> statement-breakpoint
CREATE INDEX "task_org_idx" ON "task" USING btree ("orgId");