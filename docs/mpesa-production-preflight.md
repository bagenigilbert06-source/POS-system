# M-Pesa production pre-flight

Keep `MPESA_ENV=sandbox` until Safaricom onboarding is complete. Production additionally requires `MPESA_PRODUCTION_ENABLED=true`; setting the environment alone cannot send a live request.

`MPESA_SHORTCODE` is the provider/API merchant identifier. `MPESA_TILL_NUMBER` is the customer-facing Buy Goods Till. They are independent and neither is inferred from the other.

For a deployed origin such as `https://pos.example.com`, provide Safaricom these application routes:

- STK callback: `https://pos.example.com/api/mpesa/callback` (the application adds its purpose-bound token when initiating STK)
- C2B validation: `https://pos.example.com/api/mpesa/c2b/validation`
- C2B confirmation: `https://pos.example.com/api/mpesa/c2b/confirmation`

Confirmation uses Next.js `after()` for prompt best-effort processing only after the provider event commits. Durability does not depend on that invocation. Vercel Cron calls `GET /api/mpesa/c2b/process` every minute with its automatic `Authorization: Bearer $CRON_SECRET`; operators may also invoke authenticated `POST` using `MPESA_RETRY_SECRET`. The processor claims events with PostgreSQL row locks, retries stale/temporary failures, and performs matching and finalization.

The configured every-minute recovery schedule requires a Vercel plan that supports one-minute Cron Jobs. Cron is a recovery path; normal checkout latency comes from `after()` plus the existing two-second POS status stream.

The exact origin must be the HTTPS deployment represented by `MPESA_CALLBACK_URL`. Confirm Safaricom's production merchant identifiers, payload contract, and supported callback authentication before activation.

## Shift-close behavior

- A waiting Manual Till intent blocks starting shift closure.
- A callback persisted before closure is durable even if processing overlaps closure.
- If the shift is already `closing`, financial finalization does not mutate the frozen closing summary; the event remains retryable/reconcilable for a manager.
- Payments received after intent expiry or cancellation remain stored as late payments and are never reassigned automatically.
- A payment received after a shift is fully closed never reopens it or changes historical totals; it remains in reconciliation for explicit manager handling.
