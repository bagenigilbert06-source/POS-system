# Current POS audit findings

This document replaces the original pre-hardening audit. Historical findings
were rechecked against the current Drizzle implementation instead of being
carried forward as unresolved claims.

## Verified implementation

- Drizzle ORM and PostgreSQL are the active persistence and migration layer.
- POS sales use idempotency protection, server-side totals, conditional stock
  deduction, stock movements, payment records, and audit events.
- A browser must be explicitly registered to a branch terminal.
- POS access uses a separate six-digit cashier PIN session; a dashboard session
  alone cannot open a cashier shift or complete a sale.
- Shift states are `open`, `closing`, and `closed`. Both unresolved states block
  another terminal for the cashier and another cashier on the same terminal.
- Closing is blind. Pending M-Pesa and offline work prevent unsafe closure.
- Closing revokes the POS session. Manager recovery is explicit and audited.

## Verification boundary

Database and browser claims count as verified only when run against a dedicated
`TEST_DATABASE_URL`. Test runners reject a missing URL and reject the application
database URL. Static analysis alone is not production-readiness evidence.

## Known limitation

The eTIMS model, outbox, retry controls, fiscal validation, and sandbox simulator
exist. No certified production provider adapter is installed. GavaConnect is
sandbox-only; submission, status lookup, and credit notes remain unimplemented.
