import assert from 'node:assert/strict';
import { canAutomaticallyOpenCashDrawer } from '../lib/printing/cash-drawer-policy';

const base = {
  paymentMethod: 'cash',
  saleStatus: 'completed',
  printingMode: 'direct' as const,
  cashDrawerPulseEnabled: true,
};
assert.equal(canAutomaticallyOpenCashDrawer(base), true);
assert.equal(
  canAutomaticallyOpenCashDrawer({ ...base, cashDrawerPulseEnabled: false }),
  false
);
for (const paymentMethod of [
  'mpesa',
  'card',
  'airtel_money',
  'bank_transfer',
  'credit',
  'voucher',
  'store_credit',
  'loyalty',
  'split',
])
  assert.equal(
    canAutomaticallyOpenCashDrawer({ ...base, paymentMethod }),
    false
  );
assert.equal(
  canAutomaticallyOpenCashDrawer({ ...base, printingMode: 'browser' }),
  false
);
assert.equal(
  canAutomaticallyOpenCashDrawer({ ...base, isOfflineProvisional: true }),
  false
);
assert.equal(
  canAutomaticallyOpenCashDrawer({ ...base, isRefund: true }),
  false
);
assert.equal(
  canAutomaticallyOpenCashDrawer({ ...base, isReprint: true }),
  false
);
assert.equal(
  canAutomaticallyOpenCashDrawer({ ...base, isTestPrint: true }),
  false
);
assert.equal(
  canAutomaticallyOpenCashDrawer({ ...base, isSplitPayment: true }),
  false
);
assert.equal(
  canAutomaticallyOpenCashDrawer({
    ...base,
    hasActiveRegisteredTerminal: false,
  }),
  false
);
assert.equal(
  canAutomaticallyOpenCashDrawer({ ...base, hasOpenShift: false }),
  false
);
for (const saleStatus of ['pending', 'failed', 'cancelled', 'refunded'])
  assert.equal(canAutomaticallyOpenCashDrawer({ ...base, saleStatus }), false);
console.log('Cash drawer policy tests passed');
