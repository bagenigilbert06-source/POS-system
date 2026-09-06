# Current limitations and follow-up checklist

This replaces the early gap inventory, which listed several features that now
exist. It separates release verification from future product ideas.

## Release blockers

- [ ] Run the full suite against a dedicated disposable PostgreSQL database.
- [ ] Run and pass the complete Playwright Mary-to-Jane cashier handoff.
- [ ] Validate a certified eTIMS provider before live fiscal submission; no
      certified production adapter is currently installed.

## Present behavior to retain

- [x] Explicit browser terminal registration.
- [x] Cashier PIN authentication independent of dashboard login.
- [x] Open/closing cross-terminal exclusion.
- [x] Blind cash reconciliation and variance capture.
- [x] Manager recovery for abandoned shifts.
- [x] POS-session revocation after closure.
- [x] Idempotent checkout and concurrent stock protection.
- [x] Receipt printing/reprinting and refund workflows.

## eTIMS limitations

- [x] Branch configuration, validation, outbox, retry, and review UI.
- [x] Development-only mock-provider safety boundary.
- [ ] Certified production invoice adapter.
- [ ] GavaConnect sandbox submission, status lookup, and credit notes.

Future discounts, analytics, payment providers, or widget designs are product
roadmap decisions, not testing-readiness defects.
