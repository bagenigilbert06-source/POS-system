# Pesaby eTIMS Integration Report

## Delivery status

Pesaby now has an end-to-end, branch-scoped eTIMS lifecycle integrated into sale finalization, receipts, refunds, administration, retry processing, permissions, and audit history. The included `mock` adapter is a development/sandbox simulator and is deliberately blocked in production.

Production transmission is intentionally not claimed: no certified KRA/approved-provider protocol, credentials, certificate, or onboarding material was present in the repository. The provider boundary is complete, but a real adapter must be implemented and certified from the chosen provider's official documentation before production can be enabled.

## Architecture

```text
Cash / card checkout ─┐
                     ├─> committed Pesaby sale ─> durable eTIMS outbox
M-Pesa callback ─────┘                              │
                                                   ├─> provider adapter
                                                   ├─> accepted fiscal data on receipt
                                                   └─> retry/reconciliation on failure

Refund ─> committed Pesaby return ─> linked credit-note outbox ─> provider adapter
```

External calls happen only after the local sale or return commits, so provider downtime cannot erase a paid transaction. A unique sale constraint and stable idempotency key prevent duplicate outbox records. The submission claim protects against concurrent workers, and stale `SUBMITTING` rows are recoverable after a server restart. A real provider adapter must also pass the same key upstream because the remote system is the final authority after a lost network response.

## Main files

- `drizzle/0021_etims_integration.sql`: configuration, invoice outbox, credit-note outbox, mappings, constraints, and indexes.
- `lib/etims/types.ts`: canonical provider contract and domain payloads.
- `lib/etims/provider-factory.ts`: server-only provider selection and secret-reference controls.
- `lib/etims/providers/mock-provider.ts`: explicit sandbox-only success/error simulator.
- `lib/etims/invoice-builder.ts`: constructs invoices from the committed sale and its authoritative tax totals.
- `lib/etims/service.ts`: enqueue, claim, submit, persist, retry, credit-note, audit, and receipt data lifecycle.
- `app/actions/etims.ts`: secured configuration, connection tests, reconciliation, and manual retries.
- `app/dashboard/etims/page.tsx`: configuration and reconciliation workspace.
- `app/api/etims/retry/route.ts`: protected scheduled-worker entry point.
- `tests/etims-rules.test.ts`: fiscal lifecycle and provider-boundary tests.

## Database model

`etims_configuration` is unique by organization and branch. It stores non-secret configuration and environment-variable references, never secret values.

`etims_submission` is the durable invoice outbox. It has a unique sale reference, organization-scoped idempotency key, independent fiscal status, attempt counters, next retry time, request/response JSON, provider references, acceptance timestamps, and receipt verification fields.

`etims_credit_note` links a return to its sale and accepted original invoice, with its own idempotency, status, retry, provider response, and fiscal references.

Products now support item code, unit code, tax category/rate, and VAT classification. Customers support KRA PIN, customer type, and VAT-registration status. Walk-in sales remain valid.

## Sale and correction behavior

- Cash and card completion enqueue the finalized sale after commit.
- A verified M-Pesa callback finalizes and enqueues the same sale path.
- Duplicate checkout/callback attempts resolve to the existing sale and submission.
- Receipt and reprint views use only fiscal values actually returned and stored.
- Provider QR data is rendered only when the accepted response contains it.
- Raw provider errors are withheld from the cashier and available in the authorized back office.
- Accepted/credited invoices cannot be voided; operators must use the refund/credit-note path.
- Submitting/retrying invoices cannot be voided while their remote outcome is uncertain.
- A pending or terminally failed submission is cancelled if its local sale is validly voided before fiscal acceptance.
- Partial and full refunds create idempotent credit-note submissions linked to the original accepted invoice.

## Security and operations

- Secrets are resolved only on the server from private environment-variable names; `NEXT_PUBLIC_*` references are rejected.
- The mock adapter cannot run in production, and unknown production providers fail closed.
- Configuration changes, connection tests, accepted/rejected/retried invoices, and credit notes are audited without credentials.
- Permissions separate view, management, retry, and configuration access.
- Reconciliation is organization/branch scoped and raw responses require management permission.
- The retry endpoint requires `Authorization: Bearer $ETIMS_RETRY_SECRET` and uses timing-safe comparison.
- Production base URLs must use HTTPS.

## Setup

1. Apply `drizzle/0021_etims_integration.sql` to the target database.
2. Set a strong `ETIMS_RETRY_SECRET` in the server environment.
3. In **Back office → eTIMS**, save each branch configuration.
4. For local verification only, select `sandbox` and provider `mock`, then map every sellable product's item, unit, and tax codes.
5. Configure a deployment scheduler to `POST /api/etims/retry` with the bearer secret at least once per minute.
6. Test cash, card, M-Pesa, walk-in, PIN-customer, retry, reprint, partial refund, and full refund flows in a non-production environment.

## Production prerequisites

The following must come from KRA or the selected approved integrator before real transmission can be completed:

- approved OSCU/VSCU integration route and current official API specification;
- sandbox and production base URLs;
- authentication/token protocol and required scopes;
- assigned business PIN, branch identifiers, device/system identifiers;
- client credentials and, when required, signing certificate/private key handling rules;
- official item, unit-of-measure, tax-category, VAT-classification, invoice, and credit-note code lists;
- required request signing, response verification, QR format, status lookup, and reconciliation rules;
- provider idempotency semantics and timeout/recovery procedure;
- KRA/provider sandbox acceptance, certification, and production activation.

Once supplied, implement a provider-specific class behind `EtimsProvider`, add contract tests using official sandbox examples, and complete provider/KRA certification. Do not put credentials in the database or browser.

## Verification completed

- TypeScript: `npx tsc --noEmit`
- Production build: `npm run build`
- eTIMS tests: 29 passed
- POS sale/refund rules: passed
- RBAC rules: passed
- M-Pesa callback/security rules: passed
- Inventory rules: passed
- ESLint on all changed eTIMS and lifecycle files: passed
