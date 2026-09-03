export const REPORT_SECTIONS = [
  'overview',
  'sales',
  'products',
  'payments',
  'profit',
  'inventory',
  'shifts',
  'compliance',
  'tax',
  'staff',
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number];
