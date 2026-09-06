# GavaConnect eTIMS integration requirements

This application deliberately does not infer KRA activation from a saved form,
an OAuth response, or an HTTP success. Obtain the following versioned,
certified GavaConnect material before implementing the adapter.

## A. Environments

- **REQUIRED FROM GAVACONNECT:** sandbox base URL and API version.
- **REQUIRED FROM GAVACONNECT:** production base URL and API version.
- **REQUIRED FROM GAVACONNECT:** environment separation, IP allow-listing, and
  whether sandbox identifiers/data are valid in production.

## B. Authentication

- **REQUIRED FROM GAVACONNECT:** supported authentication grant/mechanism,
  token endpoint, request schema, response schema, token lifetime, refresh
  behavior, required scopes, and required headers.
- **REQUIRED FROM GAVACONNECT:** credential provisioning, rotation, and
  revocation procedure.

## C. Device onboarding

- **REQUIRED FROM GAVACONNECT:** device registration/initialization operation,
  exact request and response schemas, device identifier/serial rules, branch
  association, KRA PIN behavior, and whether a communication key/certificate
  is issued.

## D. Activation and status

- **REQUIRED FROM GAVACONNECT:** authorization-status and device-status
  operation(s), identifiers required, documented statuses, and which response
  explicitly confirms active, pending, rejected, suspended, or initialization
  in progress.
- **REQUIRED FROM GAVACONNECT:** a correlation/reference field that can be
  safely stored as `providerReference`.

## E. Fiscal sales

- **REQUIRED FROM GAVACONNECT:** fiscal invoice endpoint, complete invoice,
  tax, item, unit, payment, customer, discount, and rounding schemas.
- **REQUIRED FROM GAVACONNECT:** response schema and fiscal receipt, control,
  QR, verification, and provider reference fields.

## F. Invoice status

- **REQUIRED FROM GAVACONNECT:** invoice-status lookup endpoint and the
  provider identifiers required to query it.

## G. Credit notes and refunds

- **REQUIRED FROM GAVACONNECT:** credit-note/refund endpoint, relationship to
  the original fiscal invoice, reason codes, and request/response schemas.

## H. Idempotency

- **REQUIRED FROM GAVACONNECT:** provider-supported idempotency mechanism,
  key scope, retention period, duplicate-response behavior, and retry rules.

## I. Errors and limits

- **REQUIRED FROM GAVACONNECT:** error-code catalogue, safe merchant-facing
  messages, retryable versus permanent errors, timeout guidance, and rate
  limits.

## J. Callbacks and webhooks

- **REQUIRED FROM GAVACONNECT:** whether callbacks/webhooks are supported;
  callback URL registration, signature/authentication verification, replay
  protection, event schemas, and retry behavior.

## K. Certification

- **REQUIRED FROM GAVACONNECT:** sandbox certification cases, production
  approval process, supported OSCU/VSCU version, and go-live prerequisites.

## Implementation hand-off

The first API operation to implement is the documented authorization/device
status lookup. It maps only documented provider outcomes into
`AUTHORIZATION_PENDING`, `INITIALIZING`, or `ACTIVE`; no other operation may
promote a connection to `ACTIVE`.

Keep credentials server-only. Existing variable names are
`GAVACONNECT_CONSUMER_KEY`, `GAVACONNECT_CONSUMER_SECRET`, and
`GAVACONNECT_APIGEE_APP_ID`; their names are implementation placeholders, not
evidence of a certified authentication contract. Never use `NEXT_PUBLIC_` for
provider credentials.
