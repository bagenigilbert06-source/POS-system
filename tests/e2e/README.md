# End-to-end tests

Install the Playwright browser once, then run the suite:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

All Playwright tests require a dedicated disposable PostgreSQL database. The
runner refuses to start when `TEST_DATABASE_URL` is missing or matches the
application `DATABASE_URL`/`DIRECT_URL`, then applies migrations before testing.

Run the public homepage flag checks, signed-in dashboard checks, and seeded
cashier terminal/shift journey with:

```bash
TEST_DATABASE_URL='postgresql://pesaby_test:password@localhost:5432/pesaby_test' \
E2E_EMAIL='e2e@example.com' \
E2E_PASSWORD='your-test-password' \
pnpm test:e2e
```

`E2E_EMAIL` and `E2E_PASSWORD` are optional and enable the pre-existing-account
dashboard navigation check. The cashier journey seeds isolated Mary/Jane test
records into the disposable database itself.

The default server runs at `http://127.0.0.1:3102`. `E2E_BASE_URL` may point to
an already-running test build, but it must use the same disposable database.
