import assert from 'node:assert/strict';
import fs from 'node:fs';

const dashboardAccess = fs.readFileSync('lib/auth/dashboard-access.ts', 'utf8');
const dashboard = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
const attendance = fs.readFileSync('app/actions/attendance.ts', 'utf8');
const receipts = fs.readFileSync('app/dashboard/receipts/layout.tsx', 'utf8');
const posPage = fs.readFileSync('app/dashboard/pos/page.tsx', 'utf8');
const dashboardLayout = fs.readFileSync('app/dashboard/layout.tsx', 'utf8');
const posPin = fs.readFileSync('app/actions/pos-pin.ts', 'utf8');

assert.match(
  dashboardAccess,
  /A full dashboard sign-in always takes precedence over a terminal PIN/
);
assert.match(dashboardAccess, /POS_WORKSPACE_PERMISSIONS/);
assert.match(dashboard, /getDashboardAuthorization\(\)/);
assert.match(attendance, /getDashboardAuthorization\(\)/);
assert.match(receipts, /requireDashboardAnyPermission/);
assert.match(
  fs.readFileSync('app/dashboard/pos/history/layout.tsx', 'utf8'),
  /redirect\('\/dashboard\/receipts'\)/
);
assert.match(posPage, /const pageAuthorization = await getDashboardAuthorization\(\)/);
assert.match(
  dashboardLayout,
  /const terminalAuthorization = session\?\.user \? null : posAuthorization/
);
assert.match(posPin, /registered to a different store/);
console.log('Cashier workspace authentication rules passed');
