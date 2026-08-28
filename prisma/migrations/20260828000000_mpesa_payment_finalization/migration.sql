-- Track the point at which a confirmed M-Pesa request has been converted into
-- exactly one completed sale. Nullable because pending and failed requests are
-- never finalized.
ALTER TABLE "mpesa_payment_request"
  ADD COLUMN IF NOT EXISTS "finalizedAt" timestamp;

ALTER TABLE "mpesa_incoming_payment"
  ADD COLUMN IF NOT EXISTS "matchedAt" timestamp,
  ADD COLUMN IF NOT EXISTS "matchedBy" text;

CREATE INDEX IF NOT EXISTS "mpesa_incoming_payment_match_lookup_idx"
  ON "mpesa_incoming_payment" ("organizationId", "branchId", "shortcode", "phone", "createdAt");
