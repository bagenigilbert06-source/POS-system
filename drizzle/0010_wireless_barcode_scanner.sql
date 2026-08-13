CREATE TABLE IF NOT EXISTS "wireless_scanner_session" (
  "id" text PRIMARY KEY NOT NULL,
  "organizationId" text NOT NULL,
  "userId" text NOT NULL,
  "tokenHash" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "lastSeenAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "wireless_scanner_session_token_unique" ON "wireless_scanner_session" ("tokenHash");
CREATE INDEX IF NOT EXISTS "wireless_scanner_session_owner_idx" ON "wireless_scanner_session" ("organizationId", "userId", "status");

CREATE TABLE IF NOT EXISTS "wireless_scanner_event" (
  "id" text PRIMARY KEY NOT NULL,
  "sessionId" text NOT NULL REFERENCES "wireless_scanner_session"("id") ON DELETE CASCADE,
  "barcode" text NOT NULL,
  "clientEventId" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "consumedAt" timestamp
);
CREATE INDEX IF NOT EXISTS "wireless_scanner_event_session_created_idx" ON "wireless_scanner_event" ("sessionId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "wireless_scanner_event_client_unique" ON "wireless_scanner_event" ("sessionId", "clientEventId");
