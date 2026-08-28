'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  beginPosSessionClose,
  cancelPosSessionClose,
  completePosSessionClose,
  getPosSessionReconciliation,
  openPosSession,
  recordCashMovement,
  submitPosSessionCount,
} from '@/app/actions/operations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notify } from '@/lib/notify';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowDownToLine,
  Banknote,
  CircleDot,
  Clock3,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';

type Reconciliation = {
  expectedCash: number;
  countedCash: number;
  variance: number;
  requiresReason: boolean;
  tolerance: number;
};
type Workspace = {
  session: {
    id: string;
    sessionNo: string;
    status: string;
    openingCash: string;
    countedCash: string | null;
    openedAt: Date;
  } | null;
  registerName: string | null;
  shiftSales: number;
  transactionCount: number;
  cashMovementCount: number;
  locationName: string;
};
const money = (amount: number) =>
  `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CashierShiftStrip({
  workspace,
  action,
  canManageCash = false,
}: {
  workspace: Workspace;
  action?: ReactNode;
  canManageCash?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openingOpen, setOpeningOpen] = useState(false),
    [movementOpen, setMovementOpen] = useState(false),
    [closingOpen, setClosingOpen] = useState(false);
  const [closeStep, setCloseStep] = useState<'count' | 'result'>('count'),
    [openingFloat, setOpeningFloat] = useState(''),
    [countedCash, setCountedCash] = useState(''),
    [varianceReason, setVarianceReason] = useState(''),
    [notes, setNotes] = useState('');
  const [movementType, setMovementType] = useState<
      'cash_in' | 'cash_out' | 'safe_drop'
    >('cash_in'),
    [movementAmount, setMovementAmount] = useState(''),
    [movementReason, setMovementReason] = useState('');
  const [error, setError] = useState(''),
    [result, setResult] = useState<Reconciliation | null>(null);
  const session = workspace.session;
  const isClosing = session?.status === 'closing';
  const shiftStartedAt = session
    ? new Intl.DateTimeFormat('en-KE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Nairobi',
      }).format(new Date(session.openedAt))
    : null;
  useEffect(() => {
    if (!isClosing) {
      setCloseStep('count');
      setResult(null);
      return;
    }
    if (session?.countedCash != null) setCloseStep('result');
  }, [isClosing, session?.countedCash]);
  const run = (
    task: () => Promise<void>,
    notice?: { loading: string; success: string; description?: string }
  ) =>
    startTransition(async () => {
      try {
        setError('');
        if (notice) {
          await notify.track(task, {
            ...notice,
            error: (cause) =>
              cause instanceof Error ? cause.message : 'Unable to update this shift',
          });
        } else {
          await task();
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Unable to update this shift';
        setError(message);
        if (!notice) notify.error(message);
      }
    });
  const openReconciliation = () =>
    run(async () => {
      if (!session) return;
      if (session.countedCash != null) {
        const preview = await getPosSessionReconciliation(session.id);
        setResult(preview);
        setCountedCash(session.countedCash);
        setCloseStep('result');
      } else {
        setResult(null);
        setCountedCash('');
        setCloseStep('count');
      }
      setClosingOpen(true);
    });
  const cancelReconciliation = () => {
    if (!session || session.status !== 'closing') return;
    run(async () => {
      await cancelPosSessionClose(session.id);
      setClosingOpen(false);
      setResult(null);
      setCountedCash('');
      setVarianceReason('');
      setNotes('');
      router.refresh();
    });
  };
  const status = result
    ? result.variance === 0
      ? 'Balanced'
      : result.variance < 0
        ? 'Short'
        : 'Over'
    : '';
  const closeBlocked =
    !result || (result.requiresReason && varianceReason.trim().length < 3);

  return (
    <>
      <section className="hidden overflow-hidden rounded-2xl border border-[#ead28a] bg-gradient-to-r from-[#fffdf7] via-[#fff9e5] to-[#fff1b8] shadow-[0_2px_8px_rgba(151,112,0,.08)] dark:border-[rgba(255,214,10,.22)] dark:from-[#15130c] dark:via-[#201b0d] dark:to-[#30270f] dark:shadow-[0_2px_8px_rgba(0,0,0,.18)] lg:block">
        <div className="flex flex-col gap-3 px-3 py-2.5 sm:px-4 sm:py-3.5 xl:flex-row xl:items-center xl:justify-between">
          <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 xl:max-w-3xl">
            <Metric
              icon={Banknote}
              label="Shift sales"
              value={money(workspace.shiftSales)}
              tone="gold"
            />
            <Metric
              icon={ReceiptText}
              label="Transactions"
              value={String(workspace.transactionCount)}
            />
            <div className="hidden sm:block">
              <Metric
                icon={CircleDot}
                label="Register"
                value={
                  session
                    ? isClosing
                      ? 'Reconciling'
                      : `Open · ${workspace.registerName ?? session.sessionNo}`
                    : 'No active shift'
                }
                tone={session ? 'success' : undefined}
              />
            </div>
          </dl>
          <div className="hidden shrink-0 flex-wrap items-center justify-end gap-2 sm:flex">
            {action}
            {!session ? (
              <Button
                className="h-9"
                onClick={() => {
                  setError('');
                  setOpeningOpen(true);
                }}
              >
                Open shift
              </Button>
            ) : isClosing ? (
              <Button
                disabled={pending}
                className="h-9"
                onClick={openReconciliation}
              >
                {session.countedCash != null
                  ? 'Review reconciliation'
                  : 'Count drawer'}
              </Button>
            ) : (
              <>
                {canManageCash && (
                  <Button
                    disabled={pending}
                    variant="outline"
                    className="h-9 bg-white/70 dark:bg-black/10"
                    onClick={() => {
                      setError('');
                      setMovementOpen(true);
                    }}
                  >
                    <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                    Cash movement
                  </Button>
                )}
                <Button
                  disabled={pending}
                  className="h-9"
                  onClick={() =>
                    run(async () => {
                      if (!session) return;
                      await beginPosSessionClose(session.id);
                      setCloseStep('count');
                      setResult(null);
                      setCountedCash('');
                      setClosingOpen(true);
                      router.refresh();
                    })
                  }
                >
                  End shift
                </Button>
              </>
            )}
          </div>
        </div>
        {session && (
          <div className="hidden flex-wrap items-center gap-x-5 gap-y-1 px-4 pb-3 text-[11px] text-[var(--dashboard-muted)] sm:flex">
            <span>Opening float {money(Number(session.openingCash))}</span>
            {shiftStartedAt && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                Shift started {shiftStartedAt}
              </span>
            )}
            <span>
              {workspace.cashMovementCount} cash movement
              {workspace.cashMovementCount === 1 ? '' : 's'}
            </span>
            {isClosing && (
              <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sales and movements are paused while you count.
              </span>
            )}
          </div>
        )}
        {error && (
          <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-destructive dark:border-red-900 dark:bg-red-950/20">
            {error}
          </p>
        )}
      </section>

      <Dialog open={openingOpen} onOpenChange={setOpeningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a shift</DialogTitle>
            <DialogDescription>
              Confirm the cash you are placing in the drawer at{' '}
              {workspace.locationName}.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm font-medium">
            Opening float{' '}
            <CurrencyInput
              value={openingFloat}
              onChange={setOpeningFloat}
              autoFocus
            />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpeningOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || openingFloat === ''}
              onClick={() =>
                run(async () => {
                  await openPosSession(Number(openingFloat));
                  setOpeningFloat('');
                  setOpeningOpen(false);
                  router.refresh();
                }, {
                  loading: 'Opening shiftâ€¦',
                  success: 'Shift opened',
                  description: 'Register is ready for sales.',
                })
              }
            >
              Open register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record cash movement</DialogTitle>
            <DialogDescription>
              This is added to the shift audit trail and included in the close
              calculation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Type{' '}
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={movementType}
                onChange={(event) =>
                  setMovementType(event.target.value as typeof movementType)
                }
              >
                <option value="cash_in">Cash in</option>
                <option value="cash_out">Cash out</option>
                <option value="safe_drop">Safe drop</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Amount{' '}
              <CurrencyInput
                value={movementAmount}
                onChange={setMovementAmount}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Reason{' '}
              <Input
                value={movementReason}
                onChange={(event) => setMovementReason(event.target.value)}
                maxLength={300}
                placeholder="Explain this movement"
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                pending || !movementAmount || movementReason.trim().length < 3
              }
              onClick={() =>
                run(async () => {
                  await recordCashMovement({
                    type: movementType,
                    amount: Number(movementAmount),
                    reason: movementReason,
                    idempotencyKey: crypto.randomUUID(),
                  });
                  setMovementAmount('');
                  setMovementReason('');
                  setMovementOpen(false);
                  router.refresh();
                }, {
                  loading: 'Recording cash movementâ€¦',
                  success: 'Cash movement recorded',
                  description: `${movementType === 'cash_in' ? 'Cash in' : movementType === 'cash_out' ? 'Cash out' : 'Safe drop'} of ${money(Number(movementAmount))} was recorded.`,
                })
              }
            >
              Save movement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={closingOpen}
        onOpenChange={(open) => {
          if (!open && session?.status === 'closing') cancelReconciliation();
          else setClosingOpen(open);
        }}
      >
        <DialogContent>
          {closeStep === 'count' ? (
            <>
              <DialogHeader>
                <DialogTitle>Count the drawer</DialogTitle>
                <DialogDescription>
                  Count the physical cash first. Expected cash stays hidden
                  until this count is committed.
                </DialogDescription>
              </DialogHeader>
              <label className="grid gap-1.5 text-sm font-medium">
                Cash physically in drawer{' '}
                <CurrencyInput
                  value={countedCash}
                  onChange={setCountedCash}
                  autoFocus
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Closing note{' '}
                <Input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                  placeholder="Optional handover note"
                />
              </label>
              <DialogFooter>
                <Button variant="outline" onClick={cancelReconciliation}>
                  Cancel reconciliation
                </Button>
                <Button
                  disabled={pending || countedCash === ''}
                  onClick={() =>
                    run(async () => {
                      if (!session) return;
                      const submitted = await submitPosSessionCount({
                        countedCash: Number(countedCash),
                        sessionId: session.id,
                      });
                      setResult(submitted);
                      setCloseStep('result');
                      router.refresh();
                    }, {
                      loading: 'Closing shiftâ€¦',
                      success: 'Shift closed',
                      description: 'Reconciliation was saved successfully.',
                    })
                  }
                >
                  Continue to reconciliation
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Reconciliation review</DialogTitle>
                <DialogDescription>
                  Review the server-calculated result before closing this shift.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ResultCard
                  label="Expected cash"
                  value={money(result?.expectedCash ?? 0)}
                />
                <ResultCard
                  label="Counted cash"
                  value={money(result?.countedCash ?? 0)}
                />
                <ResultCard
                  label="Variance"
                  value={money(result?.variance ?? 0)}
                />
                <ResultCard
                  label="Status"
                  value={status}
                  tone={status === 'Balanced' ? 'positive' : 'warning'}
                />
              </div>
              {result?.requiresReason && (
                <label className="mt-3 grid gap-1.5 text-sm font-medium">
                  Variance reason{' '}
                  <textarea
                    className="min-h-20 rounded-md border bg-background p-3 text-sm"
                    value={varianceReason}
                    onChange={(event) => setVarianceReason(event.target.value)}
                    maxLength={300}
                    placeholder="Explain the difference before closing"
                  />
                </label>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCloseStep('count');
                    setResult(null);
                    setCountedCash('');
                    setVarianceReason('');
                  }}
                >
                  Recount
                </Button>
                <Button variant="outline" onClick={cancelReconciliation}>
                  Cancel reconciliation
                </Button>
                <Button
                  disabled={pending || closeBlocked}
                  onClick={() =>
                    run(async () => {
                      if (!session || !result) return;
                      await completePosSessionClose({
                        countedCash: result.countedCash,
                        reason: varianceReason || undefined,
                        notes: notes || undefined,
                        sessionId: session.id,
                      });
                      setClosingOpen(false);
                      setResult(null);
                      setCountedCash('');
                      setVarianceReason('');
                      setNotes('');
                      router.refresh();
                    })
                  }
                >
                  Close shift
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CurrencyInput({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex h-10 items-center rounded-md border bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
      <span className="mr-2 text-xs font-semibold text-muted-foreground">
        KES
      </span>
      <input
        autoFocus={autoFocus}
        aria-label="KES amount"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none [appearance:textfield] placeholder:text-muted-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        inputMode="decimal"
        pattern="[0-9]*[.]?[0-9]*"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
              .replace(/[^0-9.]/g, '')
              .replace(/(\..*)\./g, '$1')
          )
        }
        placeholder="0.00"
      />
    </div>
  );
}
function ResultCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'warning';
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${tone === 'positive' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-700 dark:text-amber-300' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
function Metric({
  icon: Icon,
  mark,
  label,
  value,
  tone,
}: {
  icon?: typeof Banknote;
  mark?: ReactNode;
  label: string;
  value: string;
  tone?: 'gold' | 'success';
}) {
  const colour =
    tone === 'gold'
      ? 'border-[#ead38a] bg-[#fff3bd] text-[#8a6500] dark:border-[rgba(255,214,10,.2)] dark:bg-[rgba(255,214,10,.1)] dark:text-[#ffd60a]'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
        : 'border-[#e4e7ec] bg-white/70 text-[#526078] dark:border-white/10 dark:bg-white/5 dark:text-[#c4c4c4]';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${colour}`}
      >
        {mark ?? (Icon ? <Icon className="h-4 w-4" /> : null)}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold text-[var(--dashboard-muted)]">
          {label}
        </dt>
        <dd className="mt-0.5 whitespace-nowrap text-base font-bold tabular-nums text-[var(--dashboard-text)]">
          {value}
        </dd>
      </div>
    </div>
  );
}
