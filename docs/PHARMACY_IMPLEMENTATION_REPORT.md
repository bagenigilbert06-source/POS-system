# Pesaby Pharmacy implementation report

## Outcome

The pharmacy vertical reuses the existing Pesaby dashboard, POS, M-Pesa, eTIMS,
customers, staff, shifts, purchasing, inventory, reporting, receipts, permissions,
and audit infrastructure. Pharmacy behavior is enabled by the organization's
business type/category; it is not a separate application or duplicated dashboard.

This implementation is a commercial stock-and-dispensing workflow. It does not
diagnose, recommend medication, calculate doses, validate prescriptions against a
government registry, or replace a licensed pharmacist.

## Reused shared features

- Dashboard shell, responsive navigation, compact monochrome UI, authentication,
  organization and branch isolation, and role-based permissions.
- POS cart, barcode/product search, shifts, cash/card/M-Pesa checkout, receipt
  printing, refunds, offline cash queue, suspended sales, and eTIMS outbox.
- Products, categories, package conversions, customers, suppliers, purchase
  orders, goods receipt, stock ledger, cost layers, adjustments, and reports.
- Existing dashboard sales, cash, stock, staff, audit, and reconciliation data.

## Pharmacy features implemented

- Pharmacy workspace recognition for current and legacy pharmacy categories.
- Pharmacy labels and navigation on the existing dashboard; no separate theme.
- Medicine master data: generic name, manufacturer, internal code, strength,
  dosage form, pack size, prescription-required flag, restricted-item flag, and
  commercial notes.
- Pharmacy products are forced to batch/lot tracking. Opening stock must be
  received through a confirmed purchase order with batch and expiry details.
- FEFO sale allocation with transactional row locks. Expired, quarantined, empty,
  or otherwise unavailable batches cannot supply a sale.
- Immutable sale-line-to-batch allocation records for batch traceability.
- POS stock for batch-tracked products counts only positive, available, unexpired
  lots; expired quantities are not shown as sellable.
- Medicine POS search by brand, generic name, manufacturer, and internal code.
- Pharmacy POS and offline browser data are keyed by organization. A pharmacy
  cannot display or synchronize a liquor store's cached catalogue, cart, payment,
  or queued sale; legacy queues are adopted only when every product belongs to the
  current server catalogue.
- Prescription references and prescriber references captured during checkout when
  required. Restricted medicines require the pharmacy approval permission.
- Branch-scoped prescription register with receipt, customer, medicine, strength,
  dosage form, prescriber reference, recording staff, and restricted approval.
- Pharmacist and pharmacy-assistant roles can be assigned only in pharmacy
  workspaces. They are hidden from liquor staff and role screens and rejected
  server-side if submitted to a non-pharmacy organization.
- Medicine product and transaction pages show allocated batch numbers, quantities,
  expiry dates, medicine metadata, and dispensing references.
- Pharmacy report shortcuts connect to the real batch/expiry and prescription
  registers. Liquor-only age verification filters and bottle/case wording are not
  rendered in pharmacy screens.
- Medicine products without a photo use a pharmacy fallback image rather than a
  liquor product image.
- The same pharmacy checks run on direct cash/card sales and before M-Pesa payment
  initiation; confirmed M-Pesa callbacks preserve the record and batch audit.
- Prescription/restricted medicine sales are blocked from offline checkout because
  the authorization and live stock checks must run online.
- Batch and expiry dashboard with configurable warning thresholds, expiring and
  expired counts, value at risk, supplier visibility, and branch scoping.
- Authorized batch quarantine, release, and disposal with inventory ledger and
  audit events. Expired batches cannot be released.
- Pharmacy refunds enter unavailable quarantine rather than sellable inventory.
  Each returned quantity is traced to its original sale allocation when available.
- Authorized returned-stock release, supplier-return, or disposal decisions, with
  inventory updates and audit history.
- Existing pharmacy template links now point to real shared routes instead of the
  removed placeholder `/dashboard/pharmacy` and `/dashboard/prescriptions` pages.

## Database migrations

- `drizzle/0025_pharmacy_vertical.sql`: configuration, medicine metadata, FEFO
  sale allocation, prescription sale reference, and restricted-item audit tables.
- `drizzle/0026_pharmacy_return_quarantine.sql`: original sale-line reference and
  returned-medicine quarantine/disposition tracking.

Both migrations were applied successfully to the currently configured PostgreSQL
database. They are additive and safe to run again because table/index creation and
the added column are guarded.

## Setup

1. Create or configure an organization as a pharmacy (`businessType=pharmacy`, or
   a supported pharmacy business category).
2. Run migrations 0025 and 0026 in every deployment environment before deploying
   the application build.
3. Give pharmacists/managers only the permissions they need. Restricted medicine
   checkout requires `pharmacy:restricted-approve`; batch decisions require the
   inventory-adjust permission.
4. Create or edit medicines and complete the pharmacy metadata fields.
5. Receive stock through confirmed purchase orders with a unique batch number and
   expiry date. Do not import pharmacy on-hand balances without matching lots.
6. Configure warning thresholds under **Inventory → Batches and expiry**.
7. Test a normal cash sale, a prescription-required sale, a restricted sale, an
   M-Pesa sale, an expired-batch rejection, and a refund quarantine in staging.

## Verification completed

- TypeScript (`tsc --noEmit`)
- Targeted ESLint for all pharmacy and shared checkout changes
- Pharmacy rule tests (business detection, warning thresholds, FEFO ordering,
  exclusion of invalid lots, and insufficient valid stock)
- Live PostgreSQL schema integration checks
- Existing POS sale/refund, inventory, M-Pesa, offline POS, and eTIMS rule suites
- Production Next.js build

The authentication integration test was not run because this checkout has no
separate `TEST_DATABASE_URL`; its safety guard correctly prevents using the live
application database.

## Intentionally not represented as complete

The following require more product decisions, authoritative external documentation,
or a later implementation phase. The UI does not pretend these are available:

- Clinical decision support, dosage advice, drug interaction checks, diagnosis,
  or medical-record/EHR features.
- Validation against a regulator, insurer, prescriber, or controlled-drug registry.
- A full prescription document lifecycle with image storage, dispensing balances,
  repeats, partial fills, cancellations, and regulator-specific retention policy.
- A product-recall campaign workflow and customer notification system. The stored
  sale/batch trace provides the required data foundation but not campaign handling.
- Batch selection and preservation through inter-branch transfer. Existing transfer
  flows remain product-level and should not be described as pharmacy batch transfer.
- Supplier credit notes/accounting for medicine returned to a supplier. Inventory
  disposition exists, but supplier finance settlement is not automated.
- Controlled-drug statutory registers or jurisdiction-specific scheduled-medicine
  classifications. These must be implemented from confirmed local requirements.
- Existing pharmacy stock created before these migrations is not silently converted
  to lots. It must be reconciled and received with real batch/expiry information.

## Deployment checklist

- Back up the production database and verify restore access.
- Apply migrations 0025 and 0026 before starting the new application version.
- Reconcile every pharmacy product to real batches; available balance must equal
  available, unexpired lot quantities.
- Review staff roles, especially restricted approval and inventory adjustment.
- Confirm server-only M-Pesa/eTIMS secrets and production provider readiness.
- Test thermal printing and barcode scanners on each real terminal.
- Verify expiry warnings, quarantine, disposal, refund, and eTIMS credit-note flows.
- Monitor failed payments, eTIMS retries, offline sync, database jobs, and backups.
