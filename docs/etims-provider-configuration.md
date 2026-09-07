# eTIMS provider configuration

Pesaby fiscalization is provider-neutral. A branch configuration selects an
adapter by `providerName`; the provider factory owns adapter-specific secrets
and capability checks. POS checkout, the durable fiscal outbox, retry worker,
receipt rendering, and refund credit notes only use normalized `EtimsProvider`
requests and results.

## Retry worker secret

`ETIMS_RETRY_SECRET` protects `POST /api/etims/retry`. It is an internal,
server-only deployment secret, not a KRA or provider credential. Generate a
unique long random value for every environment, store it in the deployment
secret manager, and call the worker with `Authorization: Bearer <secret>`.

Rotate it by updating the secret manager and the scheduler together. Never
place it in browser environment variables, URLs, logs, or client code.

## Provider onboarding package

Before adding or enabling an adapter, retain the provider's current,
versioned sandbox documentation that defines:

- authentication and secret/certificate handling;
- device/branch initialization and status operations;
- common-code and item synchronization contracts;
- sales and credit-note request/response schemas;
- idempotency, retry, and error semantics; and
- sandbox acceptance and certification requirements.

Configure the provider's sandbox account credentials, approved taxpayer PIN,
branch/device identifiers, and any server-side certificate/key references only
in the secret manager. Do not store raw provider credentials in the database.
