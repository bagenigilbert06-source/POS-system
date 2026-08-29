export const EXPENSE_CATEGORIES = [
  'rent',
  'utilities',
  'payroll',
  'transport',
  'marketing',
  'tax',
  'maintenance',
  'licenses',
  'security',
  'general',
] as const;

// Stock purchases belong in Stock Intake so they can flow through FIFO and COGS.
// Existing historical "stock" expenses remain readable, but cannot be created again.
export const LEGACY_EXPENSE_CATEGORIES = ['stock'] as const;
export const EXPENSE_FILTER_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  ...LEGACY_EXPENSE_CATEGORIES,
] as const;

export const EXPENSE_PAYMENT_METHODS = [
  'cash',
  'mpesa',
  'airtel_money',
  'card',
  'bank',
] as const;
