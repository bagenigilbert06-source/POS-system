export type ReportPeriodPreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'this_month'
  | 'last_month'
  | 'custom';

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateKey(value: string | undefined): value is string {
  if (!value || !DATE_KEY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function moveDateKey(key: string, days: number) {
  if (!isDateKey(key)) throw new Error('Invalid report date');
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function inclusivePeriodDays(from: string, to: string) {
  if (!isDateKey(from) || !isDateKey(to) || from > to)
    throw new Error('Invalid report period');
  return (
    Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        86_400_000
    ) + 1
  );
}

export function previousPeriod(from: string, to: string) {
  const days = inclusivePeriodDays(from, to);
  return { from: moveDateKey(from, -days), to: moveDateKey(from, -1) };
}

export function resolveReportPeriod(
  preset: string,
  customFrom: string | undefined,
  customTo: string | undefined,
  today: string
) {
  if (!isDateKey(today)) throw new Error('Invalid current date');
  const monthStart = `${today.slice(0, 8)}01`;
  const previousMonthEnd = moveDateKey(monthStart, -1);
  const previousMonthStart = `${previousMonthEnd.slice(0, 8)}01`;
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'yesterday') {
    const day = moveDateKey(today, -1);
    return { from: day, to: day };
  }
  if (preset === '7d') return { from: moveDateKey(today, -6), to: today };
  if (preset === '30d') return { from: moveDateKey(today, -29), to: today };
  if (preset === 'last_month')
    return { from: previousMonthStart, to: previousMonthEnd };
  if (
    preset === 'custom' &&
    isDateKey(customFrom) &&
    isDateKey(customTo) &&
    customFrom <= customTo
  )
    return { from: customFrom, to: customTo };
  return { from: monthStart, to: today };
}

/** Sales totals are stored after discounts; completed refunds are deducted once. */
export function calculateNetSales(
  collectedAfterDiscounts: number,
  completedRefunds: number
) {
  return Math.max(0, collectedAfterDiscounts - completedRefunds);
}

export function calculateReportComparison(current: number, previous: number) {
  if (current === 0 && previous === 0)
    return { kind: 'no_activity' as const, percent: null };
  if (previous === 0) return { kind: 'new_activity' as const, percent: null };
  return {
    kind: 'change' as const,
    percent: ((current - previous) / previous) * 100,
  };
}

export function paymentShareLabel(amount: number, total: number) {
  if (!total || amount <= 0) return '0.0%';
  const percentage = (amount / total) * 100;
  if (percentage < 0.1) return '<0.1%';
  if (percentage >= 99.95 && amount < total) return '99.9%';
  return `${percentage.toFixed(1)}%`;
}

export type ReportCsvRow = Array<string | number>;

export function selectReportExportRows(
  section: string,
  rows: {
    summary: ReportCsvRow[];
    monthly: ReportCsvRow[];
    payments: ReportCsvRow[];
    products: ReportCsvRow[];
    inventory: ReportCsvRow[];
    shifts: ReportCsvRow[];
  }
) {
  if (section === 'products') return rows.products;
  if (section === 'payments') return rows.payments;
  if (section === 'sales') return [...rows.summary, [], ...rows.monthly];
  if (section === 'profit' || section === 'tax') return rows.summary;
  if (section === 'inventory') return rows.inventory;
  if (section === 'shifts') return rows.shifts;
  return [
    ...rows.summary,
    [],
    ...rows.monthly,
    [],
    ...rows.payments,
    [],
    ...rows.products,
  ];
}
