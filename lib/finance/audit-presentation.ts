import { money as formatMoney } from '@/lib/finance/money';

export type AuditValue = null | boolean | number | string | AuditValue[] | { [key: string]: AuditValue };

export type FinanceAuditEvent = {
  id: string;
  action: string;
  metadata: unknown;
  actor: string | null;
  branch: string | null;
  createdAt: Date;
};

export type PresentedFinanceAuditEvent = {
  title: string;
  category: string;
  reference?: string;
  amount?: string;
  summary?: string;
  reason?: string;
  status?: string;
  actor: string;
  branch?: string;
  timestamp: Date;
  details: AuditValue;
};

function record(value: unknown): { [key: string]: AuditValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as { [key: string]: AuditValue }
    : {};
}

function text(value: AuditValue | undefined) {
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

function money(value: AuditValue | undefined) {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number)
    ? `KES ${formatMoney(number).toNumber().toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : undefined;
}

function humanizeAction(action: string) {
  return action.replace(/[_.-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function title(action: string, details: { [key: string]: AuditValue }) {
  const labels: Record<string, string> = {
    'refund_processed': 'Refund processed',
    'expense.created': 'Expense created',
    'expense.updated': 'Expense edited',
    'expense.deleted': 'Expense deleted',
    'expense.submitted_for_approval': 'Expense submitted for approval',
    'expense.approved': 'Expense approved and posted',
    'expense.rejected': 'Expense rejected',
    'expense.voided': 'Expense voided',
    'expense.cash_out_posted': 'Expense cash-out posted',
    'invoice.cancelled': 'Invoice cancelled',
    'invoice.credit_note_issued': 'Invoice credited',
    'reconciliation.matched': 'Payment manually matched',
    'reconciliation.ignored': 'Reconciliation override',
    'financial_account.created': 'Payment account created',
    'finance_approval.requested': 'Approval requested',
    'finance_approval.approved': 'Approval approved',
    'finance_approval.rejected': 'Approval rejected',
    'finance_approval.policy_saved': `${humanizeAction(text(details.actionType) ?? 'Finance')} approval policy updated`,
    'sale_voided': 'Sale voided',
  };
  return labels[action] ?? humanizeAction(action);
}

function category(action: string) {
  if (action.startsWith('expense.')) return 'Expenses';
  if (action.startsWith('invoice.')) return 'Invoices';
  if (action.includes('credit')) return 'Customer Credit';
  if (action.startsWith('refund')) return 'Refunds';
  if (action.startsWith('card_payment_')) return 'Payments';
  if (action.startsWith('financial_account.')) return 'Account Changes';
  if (action.startsWith('reconciliation.')) return 'Reconciliation';
  if (action.startsWith('finance_approval.')) return 'Approvals';
  if (action.startsWith('shift.')) return 'Payments';
  if (action.startsWith('sale_') || action.startsWith('sales.return_')) return 'Sales';
  return 'Finance';
}

export function formatFinanceAuditEvent(event: FinanceAuditEvent): PresentedFinanceAuditEvent {
  const details = record(event.metadata);
  const reference = text(details.receiptNo) ?? text(details.invoiceNo) ?? text(details.expenseNo) ?? text(details.reference) ?? text(details.returnNo);
  const isPolicyChange = event.action === 'finance_approval.policy_saved';
  const threshold = money(details.thresholdAmount);
  const amount = isPolicyChange ? undefined : money(details.amount ?? details.total ?? details.amountReceived);
  const before = money(details.beforeAmount ?? details.previousAmount ?? details.beforeBalance ?? details.previousLimit);
  const after = money(details.afterAmount ?? details.newAmount ?? details.afterBalance ?? details.newLimit);
  const summary = before && after ? `${before} → ${after}` : amount ?? (isPolicyChange && threshold ? `Approval threshold: ${threshold}` : undefined);
  const reason = text(details.reason) ?? text(details.notes);
  const status = text(details.status) ?? text(details.afterStatus);
  return {
    title: title(event.action, details),
    category: category(event.action),
    reference,
    amount,
    summary,
    reason,
    status,
    actor: event.actor ?? 'Unknown user',
    branch: event.branch ?? undefined,
    timestamp: event.createdAt,
    details,
  };
}
