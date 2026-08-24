# Pesaby offline POS runbook

## Supported operating mode

Offline mode is a controlled continuity feature for an authenticated register with an open shift. Open the POS while connected before an outage. The register caches its catalogue and prices in IndexedDB and can then record cash sales while the loaded POS remains available.

- Cash is the only offline tender.
- M-Pesa, card, customer creation, shared held sales, and live eTIMS submission remain disabled offline.
- Each sale is written to IndexedDB before success is shown.
- Each queued sale has a UUID idempotency key and a visibly provisional `OFF-...` receipt number.
- Provisional receipts state that they are not official or fiscal receipts and omit receipt QR codes.
- Reconnection triggers sequential synchronization through the normal server-side pricing, stock, permission, shift, inventory, receipt, audit, and eTIMS paths.

## Reconnection and reconciliation

The POS banner shows pending, synchronizing, failed, and synchronized records. Failed records are retained locally and in `offline_sale_sync`; they are never silently deleted. A cashier can retry from the banner.

Synchronization can fail when:

- another register consumed the available stock;
- a product or package price changed;
- tax settings changed;
- the original shift closed or became unavailable;
- the cashier or terminal no longer has access.

The server records a safe error category (`STOCK_CONFLICT`, `PRICE_CONFLICT`, `SHIFT_CONFLICT`, or `SYNC_FAILED`). A shift with a server-received unresolved offline sale cannot be closed. Resolve or synchronize those records before completing drawer reconciliation.

## Recovery guarantees

- Browser refresh while connected reloads the IndexedDB queue and cached catalogue.
- If the active basket has already become a queued sale, refresh discards the duplicate basket and keeps the queued record as the source of truth.
- Retried requests use the same idempotency key; PostgreSQL has organization-scoped unique constraints on both the sync ledger and final sale.
- Queued quantities reserve the displayed local stock until synchronization finishes.
- A connectivity failure during cash checkout falls back to the queue; validation, permission, price, and stock errors do not.

Do not clear browser site data while offline sales are pending. Clearing IndexedDB is an operator/device action outside the application and removes the only local copy before it reaches the server.

## Deployment checklist

1. Apply `drizzle/0022_offline_pos.sql` transactionally.
2. Confirm the `offline_sale_sync` table and `sale.origin`, `sale.provisionalReceiptNo`, `sale.offlineCreatedAt`, and `sale.syncedAt` columns exist.
3. Use HTTPS in production; IndexedDB and secure POS cookies require a trusted origin.
4. Test one cash sale by taking the loaded POS offline, printing the provisional receipt, reconnecting, and confirming the official receipt and inventory movement.
5. Confirm M-Pesa, card, and eTIMS controls are unavailable during the outage.
6. Confirm a forced retry creates one final sale only.

## Deliberate security boundary

Pesaby does not cache private authenticated dashboard HTML as a service-worker response. Therefore, a completely closed or hard-reloaded browser cannot reopen the private POS while the server is unreachable. This avoids bypassing POS PIN/session revocation with stale cached HTML. Offline checkout is supported from the already authenticated, already loaded register workspace; queued sales survive refresh and synchronize when the application can load again.
