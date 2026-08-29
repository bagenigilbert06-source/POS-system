ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "invoiceDate" timestamp;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "paymentTerms" text NOT NULL DEFAULT 'due_on_receipt';
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "customerReference" text;
ALTER TABLE "invoice_item" ADD COLUMN IF NOT EXISTS "productId" text;
DO $$ BEGIN
  ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_product_id_product_id_fk" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE restrict;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
