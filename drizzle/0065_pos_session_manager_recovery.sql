-- Manager recovery metadata is additive and does not change existing shifts.
-- It records an explicit takeover while the normal blind reconciliation flow
-- remains responsible for closing the register.
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "reconciliationStartedBy" text;
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "recoveryReason" text;
ALTER TABLE "pos_session" ADD COLUMN IF NOT EXISTS "recoveryNote" text;
