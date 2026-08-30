ALTER TABLE "pos_terminal" ADD COLUMN IF NOT EXISTS "printingMode" text NOT NULL DEFAULT 'browser';
ALTER TABLE "pos_terminal" ADD COLUMN IF NOT EXISTS "printerDisplayName" text;
ALTER TABLE "pos_terminal" ADD COLUMN IF NOT EXISTS "printerIdentifier" text;
ALTER TABLE "pos_terminal" ADD COLUMN IF NOT EXISTS "paperWidth" integer NOT NULL DEFAULT 80;
ALTER TABLE "pos_terminal" ADD COLUMN IF NOT EXISTS "autoPrint" boolean NOT NULL DEFAULT false;
ALTER TABLE "pos_terminal" ADD COLUMN IF NOT EXISTS "receiptCopies" integer NOT NULL DEFAULT 1;
ALTER TABLE "pos_terminal" ADD COLUMN IF NOT EXISTS "cashDrawerPulse" boolean NOT NULL DEFAULT false;
