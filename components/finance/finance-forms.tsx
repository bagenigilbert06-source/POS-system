'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import {
  createFinancialAccount,
  decideFinanceApproval,
  importReconciliationStatement,
  reconcileTransaction,
  setFinanceApprovalPolicy,
} from '@/app/actions/finance-core-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notify } from '@/lib/notify';

const field = 'h-9 w-full rounded-md border bg-background px-3 text-sm';
const today = () => new Date().toISOString().slice(0, 10);
const key = () => crypto.randomUUID();

export function FinancialAccountDialog({
  branches,
}: {
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [branchId, setBranchId] = useState('');
  const [provider, setProvider] = useState('');
  const [masked, setMasked] = useState('');
  const save = async () => {
    setBusy(true);
    try {
      await createFinancialAccount({
        name,
        type: type as
          | 'cash_drawer'
          | 'cash'
          | 'mpesa_till'
          | 'mpesa_paybill'
          | 'bank'
          | 'card_settlement',
        branchId: branchId || undefined,
        provider: provider || undefined,
        maskedIdentifier: masked || undefined,
        reconciliationEnabled: type !== 'cash_drawer',
      });
      notify.success('Financial account created');
      setOpen(false);
      router.refresh();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Could not create account'
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add payment account</DialogTitle>
          <DialogDescription>
            Store only a masked identifier, never a full secret account number.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="space-y-2">
          <Label>Type</Label>
          <select
            className={field}
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="bank">Bank account</option>
            <option value="mpesa_till">M-Pesa Till</option>
            <option value="mpesa_paybill">M-Pesa PayBill</option>
            <option value="card_settlement">Card settlement</option>
            <option value="cash">Main cash account</option>
            <option value="cash_drawer">Cash drawer reference</option>
          </select>
        </label>
        <label className="space-y-2">
          <Label>Branch (optional)</Label>
          <select
            className={field}
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">Organization-wide</option>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <Label>Provider</Label>
          <Input
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            placeholder="Safaricom, bank, acquirerâ€¦"
          />
        </label>
        <label className="space-y-2">
          <Label>Masked identifier</Label>
          <Input
            value={masked}
            onChange={(event) => setMasked(event.target.value)}
            placeholder="â€¢â€¢â€¢â€¢ 1234"
          />
        </label>
        <Button disabled={busy || name.length < 2} onClick={save}>
          {busy ? 'Savingâ€¦' : 'Create account'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2)
    throw new Error('CSV must contain a header and at least one transaction.');
  const header = lines[0].split(',').map((value) => value.trim().toLowerCase());
  const required = ['id', 'date', 'amount', 'direction'];
  for (const name of required)
    if (!header.includes(name))
      throw new Error(`CSV is missing the ${name} column.`);
  const index = (name: string) => header.indexOf(name);
  return lines.slice(1).map((line, row) => {
    const values = line
      .split(',')
      .map((value) => value.trim().replace(/^"|"$/g, ''));
    const transactionAt = new Date(values[index('date')]);
    const amount = Number(values[index('amount')]);
    const direction = values[index('direction')].toLowerCase();
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Number.isNaN(transactionAt.getTime()) ||
      !['inflow', 'outflow'].includes(direction)
    )
      throw new Error(`Invalid values on CSV row ${row + 2}.`);
    return {
      externalId: values[index('id')],
      transactionAt,
      amount,
      direction: direction as 'inflow' | 'outflow',
      feeAmount: index('fee') >= 0 ? Number(values[index('fee')] || 0) : 0,
      reference:
        index('reference') >= 0 ? values[index('reference')] : undefined,
      description:
        index('description') >= 0 ? values[index('description')] : undefined,
    };
  });
}

export function StatementImportDialog({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const save = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      await importReconciliationStatement({
        financialAccountId: accountId,
        filename: file.name,
        rows,
      });
      notify.success(`${rows.length} statement rows imported`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Could not import statement'
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Import statement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import CSV statement</DialogTitle>
          <DialogDescription>
            Required columns: id, date, amount, direction. Optional: fee,
            reference, description. Direction is inflow or outflow.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2">
          <Label>Financial account</Label>
          <select
            className={field}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          type="file"
          accept="text/csv,.csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button disabled={busy || !file || !accountId} onClick={save}>
          {busy ? 'Validatingâ€¦' : 'Validate and import'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function ReconcileDialog({
  transaction,
  candidates,
}: {
  transaction: { id: string; amount: string };
  candidates: {
    id: string;
    label: string;
    type: 'sale_payment' | 'invoice_payment';
    amount: string;
  }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [candidate, setCandidate] = useState('');
  const [reason, setReason] = useState('');
  const idempotency = useRef(key());
  const selected = candidates.find(
    (item) => `${item.type}:${item.id}` === candidate
  );
  const different =
    selected && Number(selected.amount) !== Number(transaction.amount);
  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await reconcileTransaction({
        externalTransactionId: transaction.id,
        systemType: selected.type,
        systemId: selected.id,
        reason: reason || undefined,
        idempotencyKey: idempotency.current,
      });
      notify.success(
        different ? 'Difference recorded for review' : 'Payment reconciled'
      );
      idempotency.current = key();
      setOpen(false);
      router.refresh();
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : 'Could not reconcile transaction'
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Match
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Match statement transaction</DialogTitle>
          <DialogDescription>
            External amount: KES{' '}
            {Number(transaction.amount).toLocaleString('en-KE', {
              minimumFractionDigits: 2,
            })}
            . Matches are never accepted automatically.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2">
          <Label>System payment</Label>
          <select
            className={field}
            value={candidate}
            onChange={(event) => setCandidate(event.target.value)}
          >
            <option value="">Select payment</option>
            {candidates.map((item) => (
              <option
                key={`${item.type}:${item.id}`}
                value={`${item.type}:${item.id}`}
              >
                {item.label} â€” KES {item.amount}
              </option>
            ))}
          </select>
        </label>
        {different && (
          <label className="space-y-2">
            <Label>Difference reason</Label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Required because amounts differ"
            />
          </label>
        )}
        <Button
          disabled={busy || !selected || (!!different && reason.length < 3)}
          onClick={save}
        >
          {busy
            ? 'Savingâ€¦'
            : different
              ? 'Record difference'
              : 'Confirm exact match'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function ApprovalDecision({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(
    null
  );
  const [reason, setReason] = useState('');
  const save = async () => {
    if (!decision) return;
    setBusy(true);
    try {
      await decideFinanceApproval(id, decision, reason);
      notify.success(`Request ${decision}`);
      setDecision(null);
      setReason('');
      router.refresh();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Could not decide request'
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setDecision('rejected')}
        >
          Reject
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => setDecision('approved')}
        >
          Approve
        </Button>
      </div>
      <Dialog
        open={decision !== null}
        onOpenChange={(next) => {
          if (!next && !busy) setDecision(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision === 'approved' ? 'Approve request' : 'Reject request'}
            </DialogTitle>
            <DialogDescription>
              The decision and reason are stored permanently in the finance
              audit history.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2">
            <Label>Decision reason</Label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <Button disabled={busy || reason.trim().length < 3} onClick={save}>
            {busy ? 'Savingâ€¦' : 'Confirm decision'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ApprovalPolicyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionType, setActionType] = useState('expense');
  const [amount, setAmount] = useState('');
  const save = async () => {
    setBusy(true);
    try {
      await setFinanceApprovalPolicy({
        actionType,
        thresholdAmount: Number(amount),
        preventSelfApproval: true,
        isActive: true,
      });
      notify.success('Approval policy saved');
      setOpen(false);
      router.refresh();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Could not save policy'
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Approval policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finance approval policy</DialogTitle>
          <DialogDescription>
            Actions at or above this amount require a separate decision.
            Self-approval is disabled.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2">
          <Label>Action</Label>
          <select
            className={field}
            value={actionType}
            onChange={(event) => setActionType(event.target.value)}
          >
            <option value="expense">Expense</option>
            <option value="refund">Refund</option>
            <option value="discount_override">Discount override</option>
            <option value="credit_writeoff">Credit write-off</option>
            <option value="reconciliation_difference">
              Reconciliation difference
            </option>
          </select>
        </label>
        <label className="space-y-2">
          <Label>Threshold amount</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <Button disabled={busy || Number(amount) < 0} onClick={save}>
          {busy ? 'Savingâ€¦' : 'Save policy'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
