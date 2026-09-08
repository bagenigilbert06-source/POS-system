-- New terminals default to one automatic 80 mm receipt. Existing explicit
-- settings are preserved; this only changes the schema default for new rows.
ALTER TABLE "business_settings" ALTER COLUMN "receiptAutoPrint" SET DEFAULT true;
ALTER TABLE "pos_terminal" ALTER COLUMN "autoPrint" SET DEFAULT true;
