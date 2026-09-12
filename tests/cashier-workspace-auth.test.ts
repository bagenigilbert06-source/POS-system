import assert from 'node:assert/strict';
import fs from 'node:fs';

const dashboardAccess = fs.readFileSync('lib/auth/dashboard-access.ts', 'utf8');
const dashboard = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
const attendance = fs.readFileSync('app/actions/attendance.ts', 'utf8');
const receipts = fs.readFileSync('app/dashboard/receipts/layout.tsx', 'utf8');
const posPage = fs.readFileSync('app/dashboard/pos/page.tsx', 'utf8');
const dashboardLayout = fs.readFileSync('app/dashboard/layout.tsx', 'utf8');
const posPin = fs.readFileSync('app/actions/pos-pin.ts', 'utf8');
const posPageService = fs.readFileSync(
  'lib/services/pos-page-service.ts',
  'utf8'
);
const settingsActions = fs.readFileSync(
  'app/actions/settings-actions.ts',
  'utf8'
);
const dashboardLayoutClient = fs.readFileSync(
  'components/layout/dashboard-layout-client.tsx',
  'utf8'
);
const editableSettings = fs.readFileSync(
  'components/settings/editable-settings.tsx',
  'utf8'
);
const qzRoute = fs.readFileSync('app/api/qz/route.ts', 'utf8');
const rawTcpRoute = fs.readFileSync(
  'app/api/printing/raw-tcp/route.ts',
  'utf8'
);
const adminActions = fs.readFileSync('app/actions/admin-actions.ts', 'utf8');
const posTerminal = fs.readFileSync('components/pos/pos-terminal.tsx', 'utf8');
const posAuth = fs.readFileSync('lib/pos/pos-auth.ts', 'utf8');
const operations = fs.readFileSync('app/actions/operations.ts', 'utf8');
const printerStatus = fs.readFileSync(
  'components/pos/terminal-printer-status.tsx',
  'utf8'
);
const terminalPrinterSettings = fs.readFileSync(
  'components/admin/terminal-printer-settings.tsx',
  'utf8'
);
const devicesPage = fs.readFileSync(
  'app/dashboard/admin/devices/page.tsx',
  'utf8'
);

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
assert.match(
  posPage,
  /const pageAuthorization = await getDashboardAuthorization\(\)/
);
assert.match(
  posPage,
  /const candidatePosAuthorization = await getPosAuthorizationContext\(\)/
);
assert.match(
  posPage,
  /candidatePosAuthorization\?\.organizationId\s*===\s*pageAuthorization\.organizationId/
);
assert.match(
  dashboardLayout,
  /const terminalAuthorization = session\?\.user \? null : posAuthorization/
);
assert.match(posPin, /registered to a different store/);
assert.match(
  posPin,
  /const unlocked = await unlockPosWithStaffPin\(context\.userId, pin\)/
);
assert.match(
  posPageService,
  /receiptBusinessName:\s*settings\?\.receiptBusinessName\?\.trim\(\)/
);
assert.match(
  settingsActions,
  /terminal\?\.organizationId === orgId && hasPrinterUpdate/
);
assert.match(settingsActions, /cashDrawerPulse: data\.receiptCashDrawerPulse/);
assert.match(dashboardLayoutClient, /\{!isPosWorkspace && \(/);
assert.match(
  fs.readFileSync('components/layout/dynamic-app-sidebar.tsx', 'utf8'),
  /if \(adminMode\) setAdminExpanded\(true\)/
);
assert.match(
  editableSettings,
  /receiptBusinessName: e\.target\.value, displayName: e\.target\.value/
);
assert.match(
  editableSettings,
  /await updateBusinessSettings\(\{\s*receiptLogoUrl: result\.url,\s*receiptTemplate: 'logo'/
);
assert.match(editableSettings, /Receipt logo uploaded and saved/);
assert.match(
  qzRoute,
  /!dashboardSession\?\.user && !\(await getPosAuthorizationContext\(\)\)/
);
assert.match(
  rawTcpRoute,
  /dashboardSession\?\.user \|\| \(await getPosAuthorizationContext\(\)\)/
);
assert.match(adminActions, /await db\.transaction\(async \(tx\) =>/);
assert.match(
  posTerminal,
  /setTimeout\(\(\) => \{\s*autoPrintedReceiptRef\.current = receipt\.saleId;\s*void handlePrintReceipt\(true\);/
);
assert.match(posPin, /pinAlreadyVerified: true/);
assert.match(posPin, /!verified\?\.pinAlreadyVerified/);
assert.match(
  fs.readFileSync('components/pos/cashier-shift-strip.tsx', 'utf8'),
  /setUnlockedForOpening\(true\)[\s\S]*startTransition\(\(\) => router\.refresh\(\)\)/
);
const cashierShiftStrip = fs.readFileSync(
  'components/pos/cashier-shift-strip.tsx',
  'utf8'
);
assert.match(cashierShiftStrip, /placeholder="Enter PIN"/);
assert.match(
  cashierShiftStrip,
  /unlockPin \? 'tracking-\[0\.28em\]' : 'tracking-normal'/
);
assert.match(cashierShiftStrip, /id="pos-unlock-pin"/);
assert.match(cashierShiftStrip, /Opening cash/);
assert.match(cashierShiftStrip, /Record the cash physically placed in the drawer/);
assert.doesNotMatch(cashierShiftStrip, /Opening float/);
assert.match(cashierShiftStrip, /if \(!opened\.success\) throw new Error\(opened\.error\)/);
assert.match(operations, /async function openPosSessionInternal/);
assert.match(operations, /POS shift storage needs an update/);
assert.match(
  posAuth,
  /posTerminalCookieOptions[\s\S]*maxAge: 60 \* 60 \* 24 \* 365/
);
assert.match(posAuth, /posCashierCookieOptions[\s\S]*maxAge: 60 \* 60 \* 12/);
const finalClose = operations.slice(
  operations.indexOf('export async function completePosSessionClose')
);
assert.match(finalClose, /jar\.delete\(POS_AUTH_COOKIE\)/);
assert.match(finalClose, /jar\.delete\(POS_LOCKED_SESSION_COOKIE\)/);
assert.doesNotMatch(finalClose, /POS_TERMINAL_COOKIE|update\(posTerminal\)/);
assert.match(printerStatus, /getDirectPrinterStatus\(configuredName\)/);
assert.doesNotMatch(
  printerStatus,
  /updatePosTerminalPrinter|localStorage|sessionStorage/
);
assert.match(terminalPrinterSettings, /void checkSavedPrinter\(\)/);
assert.match(terminalPrinterSettings, /visibilitychange/);
assert.match(terminalPrinterSettings, /window\.addEventListener\('online', reconnect\)/);
assert.match(terminalPrinterSettings, /window\.setInterval[\s\S]*30_000/);
assert.match(devicesPage, /currentDevice=\{currentDevice\}/);
assert.match(posPageService, /eq\(posTerminal\.organizationId, orgId\)/);
assert.match(
  posPageService,
  /eq\(posTerminal\.branchId, authorizedTerminalBranchId\)/
);
assert.match(posPageService, /eq\(posTerminal\.status, 'active'\)/);
console.log('Cashier workspace authentication rules passed');
