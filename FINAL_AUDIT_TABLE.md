# Current verification table

| Area | Current implementation | Required verification |
|---|---|---|
| Persistence | Drizzle ORM, PostgreSQL, Drizzle migrations | Full suite on disposable PostgreSQL |
| Sale integrity | Idempotent creation and conditional stock deduction | Rules and DB integrations |
| Terminal identity | Explicit branch-terminal browser registration | Fresh-browser Playwright journey |
| Cashier identity | Six-digit PIN session separate from dashboard auth | PIN and browser tests |
| Shift ownership | One unresolved (`open`/`closing`) shift per cashier and terminal | Shift DB/concurrency tests |
| Reconciliation | Blind count, variance handling, audited close | DB and browser tests |
| Session boundary | Shift close revokes POS session | Stale-browser check |
| Manager recovery | Explicit reason and audited takeover | DB and browser checks |
| Homepage flag | Disabled redirects; enabled renders marketing | Two Playwright modes |
| eTIMS | Internal workflow and sandbox boundary | Production adapter remains a blocker |

The old Prisma migration and unconditional readiness statements were stale and
have been removed. A production build does not replace a passing cashier browser
journey.
