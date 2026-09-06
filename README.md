# Pesaby Business Operating System

Pesaby is a Business Operating System for modern commerce. It connects sales, inventory, expenses, customers, staff, branches, payments, and reporting in one workspace.

## Features

- **Sales and payments**: Run checkout, receipts, discounts, refunds, and payment workflows.
- **Inventory and purchasing**: Track stock movement, suppliers, receiving, and reorder points.
- **People and branches**: Manage staff access, customers, locations, and operational controls.
- **Reporting**: Review sales, expenses, margins, payment mix, and branch performance.
- **Responsive landing experience**: Clear, accessible layouts for desktop, tablet, and mobile.

## Tech Stack

- **Next.js 16** and React: Application framework and UI runtime.
- **Drizzle ORM** and PostgreSQL: Current application persistence and migrations.
- **Better Auth**: Authentication and session management.
- **Tailwind CSS**: Utility-first styling system.

### Prerequisites

- **Node.js** (v18 or later)
- **pnpm**
- PostgreSQL database configured through the environment variables.

### Local development

```bash
pnpm install
pnpm dev
```

The app is available at `http://localhost:3000`.

### Tests and disposable database

Database-backed tests never use `DATABASE_URL` as a fallback. Create a separate,
disposable PostgreSQL database and provide it explicitly:

```bash
TEST_DATABASE_URL='postgresql://pesaby_test:password@localhost:5432/pesaby_test' pnpm test
```

The runner refuses missing test configuration and refuses a test URL that
equals `DATABASE_URL` or `DIRECT_URL`. It applies Drizzle migrations first.

For browser coverage, install Chromium once and run:

```bash
pnpm exec playwright install chromium
TEST_DATABASE_URL='postgresql://pesaby_test:password@localhost:5432/pesaby_test' pnpm test:e2e
```

See `tests/e2e/README.md` for the browser-test details.

### POS shift boundary

A registered browser terminal and valid cashier PIN session are required to
open a register or complete a sale. A cashier may have only one unresolved
shift (`open` or `closing`) across terminals. Closing uses blind cash counting,
then revokes the POS session and returns the terminal to PIN entry. Managers can
recover abandoned shifts through Operations without silently closing them.

### eTIMS status

Pesaby contains branch configuration, validation, an outbox/retry workflow,
credit-note coordination, and a development simulator. A certified production
provider adapter is not installed. GavaConnect is sandbox-only and its invoice
submission, status lookup, and credit-note methods remain unimplemented.
