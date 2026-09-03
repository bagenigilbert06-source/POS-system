-- Keep compliance states explicit and make one checkout record immutable after linkage.
ALTER TABLE "age_verification"
  ADD CONSTRAINT "age_verification_status_check"
  CHECK ("status" IN ('VERIFIED', 'CANCELLED', 'OVERRIDDEN'));
CREATE INDEX IF NOT EXISTS "age_verification_checkout_status_idx"
  ON "age_verification" ("organizationId", "checkoutId", "status");
