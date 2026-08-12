CREATE TABLE IF NOT EXISTS "pos_pin_credential" (
  "userId" text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "pinHash" text NOT NULL, "failedAttempts" integer NOT NULL DEFAULT 0,
  "lockedUntil" timestamp, "enabled" boolean NOT NULL DEFAULT true,
  "setAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "pos_terminal" (
  "id" text PRIMARY KEY, "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE, "tokenHash" text NOT NULL UNIQUE,
  "name" text NOT NULL DEFAULT 'POS terminal', "status" text NOT NULL DEFAULT 'active',
  "registeredBy" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "createdAt" timestamp NOT NULL DEFAULT now(), "lastSeenAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "pos_terminal_org_idx" ON "pos_terminal" ("organizationId");
CREATE INDEX IF NOT EXISTS "pos_terminal_branch_idx" ON "pos_terminal" ("branchId");
CREATE TABLE IF NOT EXISTS "pos_auth_session" (
  "id" text PRIMARY KEY, "tokenHash" text NOT NULL UNIQUE,
  "terminalId" text NOT NULL REFERENCES "pos_terminal"("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "organizationId" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "branchId" text NOT NULL REFERENCES "branch"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'active', "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(), "lastSeenAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "pos_auth_session_terminal_idx" ON "pos_auth_session" ("terminalId");
CREATE INDEX IF NOT EXISTS "pos_auth_session_user_idx" ON "pos_auth_session" ("userId");
