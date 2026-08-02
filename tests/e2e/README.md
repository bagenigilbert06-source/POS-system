# End-to-end tests

Install the Playwright browser once, then run the suite:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

The public suite starts the app at `http://127.0.0.1:3102` and verifies the landing page, sign-in page, and guest redirects from protected dashboard routes.

To also test signed-in dashboard navigation and the light/dark theme switcher, use a dedicated test account and database:

```bash
TEST_DATABASE_URL='postgresql://...' \
DATABASE_URL="$TEST_DATABASE_URL" \
DIRECT_URL="$TEST_DATABASE_URL" \
E2E_EMAIL='e2e@example.com' \
E2E_PASSWORD='your-test-password' \
pnpm test:e2e
```

Use `E2E_BASE_URL=http://127.0.0.1:3000 pnpm test:e2e` to test an already running application instead of starting a local server.
