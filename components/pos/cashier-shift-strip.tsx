'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  beginPosSessionClose,
  cancelPosSessionClose,
  completePosSessionClose,
  confirmManualCashDrawerOpen,
  claimManualCashDrawerPulse,
  getPosSessionReconciliation,
  openPosSession,
  recordCashMovement,
  requestManualCashDrawerOpen,
  submitPosSessionCount,
} from '@/app/actions/operations';
import { unlockPosByPin } from '@/app/actions/pos-pin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notify } from '@/lib/notify';
import {
  formatRegisterShiftDuration,
  registerShiftDurationMinutes,
} from '@/lib/pos/shift-duration';
import { openQzCashDrawer } from '@/lib/printing/receipt-print-service';
import { TerminalPrinterStatus } from '@/components/pos/terminal-printer-status';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Home,
  ReceiptText,
  ArchiveRestore,
  MoreHorizontal,
  LockKeyhole,
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
  cashierName: string | null;
  shiftSales: number;
  transactionCount: number;
  cashMovementCount: number;
  locationName: string;
  timeZone?: string;
  mpesaCounters?: {
    confirmed: number;
    pending: number;
    failed: number;
    reconciliationRequired: number;
  };
};
const money = (amount: number) =>
  `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compactMoney = (amount: number) =>
  `KES ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export function CashierShiftStrip({
  workspace,
  action,
  posUnlocked = false,
  canManageCash = false,
  directDrawerConfigured = false,
  printerMode = 'browser',
  printerName = '',
}: {
  workspace: Workspace;
  action?: ReactNode;
  /** A cashier POS-PIN session, distinct from a normal dashboard login. */
  posUnlocked?: boolean;
  canManageCash?: boolean;
  directDrawerConfigured?: boolean;
  printerMode?: 'direct' | 'browser';
  printerName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openingOpen, setOpeningOpen] = useState(false),
    [movementOpen, setMovementOpen] = useState(false),
    [drawerOpen, setDrawerOpen] = useState(false),
    [closingOpen, setClosingOpen] = useState(false);
  const [closeStep, setCloseStep] = useState<'count' | 'result'>('count'),
    [openingFloat, setOpeningFloat] = useState(''),
    [openingNote, setOpeningNote] = useState(''),
    [countedCash, setCountedCash] = useState(''),
    [varianceReason, setVarianceReason] = useState(''),
    [notes, setNotes] = useState('');
  const [movementType, setMovementType] = useState<
      'cash_in' | 'cash_out' | 'safe_drop'
    >('cash_in'),
    [movementAmount, setMovementAmount] = useState(''),
    [movementReason, setMovementReason] = useState('');
  const [drawerReason, setDrawerReason] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockedForOpening, setUnlockedForOpening] = useState(false);
  const [liveShiftSales, setLiveShiftSales] = useState(workspace.shiftSales);
  const [liveTransactionCount, setLiveTransactionCount] = useState(
    workspace.transactionCount
  );
  const observedSalesRef = useRef(new Set<string>());
  const drawerRequestRef = useRef<string | null>(null);
  const openingRequestRef = useRef<string | null>(null);
  const [error, setError] = useState(''),
    [result, setResult] = useState<Reconciliation | null>(null);
  const session = workspace.session;
  const mpesa = workspace.mpesaCounters ?? {
    confirmed: 0,
    pending: 0,
    failed: 0,
    reconciliationRequired: 0,
  };
  const isClosing = session?.status === 'closing';
  const [now, setNow] = useState(() => Date.now());
  const sessionOpenedAt = session?.openedAt;
  const terminalConfigured = Boolean(workspace.registerName);
  const registerUnlocked = posUnlocked || unlockedForOpening;
  const cashierDisplayName = formatPersonName(workspace.cashierName);
  const shiftStartedAt = session
    ? new Intl.DateTimeFormat('en-KE', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: workspace.timeZone ?? 'Africa/Nairobi',
      }).format(new Date(session.openedAt))
    : null;
  const elapsedShiftDuration = session
    ? formatRegisterShiftDuration(
        registerShiftDurationMinutes(session.openedAt, new Date(now))
      )
    : null;
  useEffect(() => {
    // Once the refreshed server model confirms the secure POS session, clear
    // the temporary bridge so a later explicit lock cannot retain stale UI.
    if (posUnlocked) setUnlockedForOpening(false);
  }, [posUnlocked]);
  useEffect(() => {
    if (!sessionOpenedAt) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [session?.id, sessionOpenedAt]);
  useEffect(() => {
    if (!isClosing) {
      setCloseStep('count');
      setResult(null);
      return;
    }
    if (session?.countedCash != null) setCloseStep('result');
  }, [isClosing, session?.countedCash]);
  useEffect(() => {
    setLiveShiftSales(workspace.shiftSales);
    setLiveTransactionCount(workspace.transactionCount);
  }, [workspace.shiftSales, workspace.transactionCount]);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ saleId: string; amount: number }>)
        .detail;
      if (!detail?.saleId || observedSalesRef.current.has(detail.saleId))
        return;
      observedSalesRef.current.add(detail.saleId);
      setLiveShiftSales((current) => current + detail.amount);
      setLiveTransactionCount((current) => current + 1);
    };
    window.addEventListener('pesaby:shift-sale-completed', update);
    return () =>
      window.removeEventListener('pesaby:shift-sale-completed', update);
  }, []);
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
              cause instanceof Error && cause.message
                ? cause.message
                : 'Unable to update this shift',
          });
        } else {
          await task();
        }
      } catch (cause) {
        let message = 'Unable to update this shift';
        try {
          if (cause instanceof Error && typeof cause.message === 'string')
            message = cause.message;
          else if (typeof cause === 'string') message = cause;
        } catch {
          /* framework-wrapped server errors can expose read-only fields */
        }
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

  const updateUnlockPin = (value: string) => {
    setUnlockPin(value.replace(/\D/g, '').slice(0, 6));
    if (unlockError) setUnlockError('');
  };

  const unlockRegister = async () => {
    if (unlocking) return;
    if (unlockPin.length !== 6) {
      setUnlockError('Enter your six-digit POS PIN.');
      return;
    }
    setUnlocking(true);
    setUnlockError('');
    try {
      const response = await unlockPosByPin(unlockPin);
      if (!response.success) {
        const detailedError = 'error' in response ? response.error : '';
        setUnlockPin('');
        setUnlockError(
          detailedError.includes('open shift') ||
            detailedError.includes('different store')
            ? detailedError
            : 'That PIN could not unlock this register. Check it and try again.'
        );
        return;
      }
      setUnlockPin('');
      setUnlockedForOpening(true);
      notify.success('Register unlocked');
      startTransition(() => router.refresh());
    } catch {
      setUnlockPin('');
      setUnlockError('Unable to unlock this register. Please try again.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <>
      <section className="pos-shift-strip hidden overflow-hidden rounded-[8px] border border-[#dfe3e8] bg-white font-sans shadow-[0_3px_10px_rgba(16,24,40,.05)] dark:border-white/10 dark:bg-[#161616] dark:shadow-[0_3px_10px_rgba(0,0,0,.18)] lg:block">
        <div className="flex flex-col gap-2 px-3 py-2 sm:px-4 sm:py-2.5 xl:flex-row xl:items-center xl:justify-between">
          <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 lg:max-w-4xl">
            <SummaryMetric
              icon={Banknote}
              label="Shift sales"
              value={money(liveShiftSales)}
            />
            <SummaryMetric
              icon={ReceiptText}
              label="Transactions"
              value={String(liveTransactionCount)}
            />
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#b8e5c8] bg-[#f1fbf4] text-[10px] font-extrabold tracking-[-0.05em] text-[#17883b] dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                M
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dashboard-muted)]">
                  M-Pesa
                </dt>
                <dd className="mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums tracking-[-0.01em] text-[var(--dashboard-text)]">
                  {mpesa.confirmed} confirmed
                </dd>
              </div>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dashboard-muted)]">
                Register
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-[var(--dashboard-text)]">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${session ? (isClosing ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-400'}`}
                  aria-hidden="true"
                />
                {session
                  ? isClosing
                    ? 'Closing'
                    : `Open · ${workspace.registerName ?? session.sessionNo}`
                  : 'Closed'}
              </dd>
              <dd
                className="mt-0.5 truncate text-[11px] text-[var(--dashboard-muted)]"
                title={
                  session
                    ? `${workspace.registerName ?? session.sessionNo}${cashierDisplayName ? ` · ${cashierDisplayName}` : ''}`
                    : 'No active register'
                }
              >
                {session ? (
                  <>
                    {workspace.registerName ?? session.sessionNo}
                    {cashierDisplayName ? ` · ${cashierDisplayName}` : ''}
                  </>
                ) : (
                  'No active register'
                )}
              </dd>
              <TerminalPrinterStatus
                mode={printerMode}
                printerName={printerName}
              />
            </div>
          </dl>
          <div className="hidden shrink-0 flex-wrap items-center justify-end gap-2 sm:flex">
            {!registerUnlocked && (
              <Link
                href="/dashboard"
                aria-label="Back to dashboard"
                title="Back to dashboard"
                className="group inline-flex h-8 items-center gap-1 rounded-md bg-[#b7791f]/10 px-2 text-xs font-semibold text-[#8a6500] transition-colors hover:bg-[#b7791f]/15 dark:bg-[#facc15]/10 dark:text-[#facc15] dark:hover:bg-[#facc15]/15"
              >
                <Home className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
                <span>Home</span>
              </Link>
            )}
            {action}
            {!session ? (
              <Button
                className="h-8 bg-[#d99b00] text-[#241d00] hover:bg-[#c58d00]"
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
                className="h-8 bg-amber-600 text-white hover:bg-amber-700"
                onClick={openReconciliation}
              >
                {session.countedCash != null
                  ? 'Review reconciliation'
                  : 'Count drawer'}
              </Button>
            ) : (
              <>
                {canManageCash && (
                  <>
                    <Button
                      disabled={pending}
                      variant="outline"
                      className="h-8 bg-white/55 dark:bg-black/10"
                      onClick={() => {
                        setError('');
                        setMovementOpen(true);
                      }}
                    >
                      <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                      Cash movement
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          disabled={pending}
                          variant="outline"
                          className="h-8 w-8 bg-white/55 p-0 dark:bg-black/10"
                          aria-label="Register actions"
                          title="Register actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-56">
                        <DropdownMenuLabel>Register actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={!directDrawerConfigured}
                          onSelect={() => {
                            setError('');
                            setDrawerReason('');
                            drawerRequestRef.current = crypto.randomUUID();
                            setDrawerOpen(true);
                          }}
                        >
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Open cash drawer
                        </DropdownMenuItem>
                        {!directDrawerConfigured && (
                          <p className="px-2 pb-1.5 text-xs text-muted-foreground">
                            Configure a direct receipt printer for this terminal
                            first.
                          </p>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                <Button
                  disabled={pending}
                  className="h-8 bg-amber-600 text-white hover:bg-amber-700"
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
          <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2 text-[10px] text-[var(--dashboard-muted)] sm:flex">
            <span>Float {compactMoney(Number(session.openingCash))}</span>
            <span aria-hidden="true">•</span>
            {shiftStartedAt && (
              <>
                <span>Started {shiftStartedAt}</span>
                {elapsedShiftDuration && (
                  <span>Elapsed {elapsedShiftDuration}</span>
                )}
                <span aria-hidden="true">•</span>
              </>
            )}
            <span>
              {workspace.cashMovementCount} cash movement
              {workspace.cashMovementCount === 1 ? '' : 's'}
            </span>
            {isClosing && (
              <>
                <span aria-hidden="true">•</span>
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Sales paused during reconciliation
                </span>
              </>
            )}
          </div>
        )}
        {error && (
          <p className="flex items-center justify-between gap-3 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-destructive dark:border-red-900 dark:bg-red-950/20">
            {error}
            {/M-Pesa payment/i.test(error) && (
              <Link
                href="/dashboard/finance/reconciliation?channel=mpesa"
                className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
              >
                Review payments
              </Link>
            )}
          </p>
        )}
      </section>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open cash drawer</DialogTitle>
            <DialogDescription>
              This opens the physical drawer without creating a sale or printing
              a receipt. Confirm the reason before continuing.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm font-medium">
            Reason
            <Input
              autoFocus
              value={drawerReason}
              onChange={(event) => setDrawerReason(event.target.value)}
              maxLength={300}
              placeholder="Why is the drawer being opened?"
            />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || drawerReason.trim().length < 3}
              onClick={() => {
                const idempotencyKey =
                  drawerRequestRef.current ?? crypto.randomUUID();
                run(async () => {
                  if (!session) throw new Error('An active shift is required');
                  const request = await requestManualCashDrawerOpen({
                    sessionId: session.id,
                    reason: drawerReason,
                    idempotencyKey,
                  });
                  const claim = await claimManualCashDrawerPulse(
                    request.requestId
                  );
                  if (!claim.shouldPulse)
                    throw new Error(
                      'This drawer-open request was already dispatched'
                    );
                  if (request.transport === 'raw-tcp') {
                    const response = await fetch(
                      '/api/printing/raw-tcp/drawer',
                      {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                          manualRequestId: request.requestId,
                        }),
                      }
                    );
                    if (!response.ok) throw new Error(await response.text());
                  } else if (request.printerName)
                    await openQzCashDrawer(request.printerName);
                  await confirmManualCashDrawerOpen(request.requestId);
                  setDrawerOpen(false);
                  setDrawerReason('');
                  drawerRequestRef.current = null;
                  notify.success('Cash drawer opened');
                });
              }}
            >
              Confirm and open
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openingOpen}
        onOpenChange={(open) => {
          setOpeningOpen(open);
          if (!open) {
            setUnlockPin('');
            setUnlockError('');
          }
        }}
      >
        <DialogContent
          onKeyDown={(event) => {
            if (
              event.key !== 'Enter' ||
              !(event.target instanceof HTMLInputElement)
            )
              return;
            event.preventDefault();
            if (!registerUnlocked && terminalConfigured) void unlockRegister();
            else
              document
                .querySelector<HTMLButtonElement>('[data-open-register-submit]')
                ?.click();
          }}
          className="gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground shadow-2xl shadow-slate-950/20 dark:shadow-black/50 sm:max-w-[440px]"
        >
          <DialogHeader className="space-y-2 border-b border-border bg-muted/35 px-6 py-5 text-left">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              POS access
            </span>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {registerUnlocked ? 'Open register' : 'Unlock register'}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5 text-[var(--dashboard-muted)]">
              <span>{workspace.registerName || 'POS register'}</span>
              <span aria-hidden="true">•</span>
              <span>{workspace.locationName}</span>
            </DialogDescription>
          </DialogHeader>
          {!terminalConfigured && (
            <p className="m-6 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              This device is not assigned to a POS terminal. Configure the terminal before opening a register.
            </p>
          )}
          {!registerUnlocked && terminalConfigured ? (
            <div className="grid gap-5 px-6 py-6">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {cashierDisplayName || 'Cashier'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Enter your staff PIN to continue
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="pos-unlock-pin" className="text-sm font-semibold text-foreground">
                    POS PIN
                  </label>
                  <span className="text-xs text-muted-foreground">6 digits</span>
                </div>
                <Input
                  id="pos-unlock-pin"
                  value={unlockPin}
                  onChange={(event) => updateUnlockPin(event.target.value)}
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  placeholder="Enter PIN"
                  className={`h-14 rounded-xl border-border bg-muted/30 px-4 text-center text-xl font-semibold placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus-visible:border-primary focus-visible:ring-primary/20 ${
                    unlockPin ? 'tracking-[0.28em]' : 'tracking-normal'
                  }`}
                  aria-invalid={Boolean(unlockError)}
                  aria-describedby="pos-unlock-pin-help"
                />
                <p id="pos-unlock-pin-help" className="text-xs leading-5 text-muted-foreground">
                  Your PIN is private and is not shared with your dashboard password.
                </p>
              </div>
              {unlockError && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {unlockError}
                </p>
              )}
              <DialogFooter className="mt-1 border-t border-border pt-4 sm:justify-end">
                <Button variant="outline" onClick={() => setOpeningOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="min-w-32"
                  disabled={unlocking || unlockPin.length !== 6}
                  onClick={() => void unlockRegister()}
                >
                  {unlocking ? 'Unlocking...' : 'Unlock register'}
                </Button>
              </DialogFooter>
            </div>
          ) : terminalConfigured ? (
            <>
              <label className="grid gap-1.5 text-sm font-medium">
                Opening cash
                <CurrencyInput
                  value={openingFloat}
                  onChange={setOpeningFloat}
                  autoFocus
                />
                <span className="text-xs font-normal leading-4 text-muted-foreground">
                  Cash physically placed in the drawer at the start of the
                  shift.
                </span>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                <span>
                  Opening note{' '}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </span>
                <Input
                  value={openingNote}
                  onChange={(event) => setOpeningNote(event.target.value)}
                  maxLength={500}
                  placeholder="e.g. Float received from manager"
                />
              </label>
              <DialogFooter className="border-t border-border pt-3 sm:justify-end">
                <Button variant="outline" onClick={() => setOpeningOpen(false)}>
                  Cancel
                </Button>
                <Button
                  data-open-register-submit
                  disabled={
                    pending ||
                    !terminalConfigured ||
                    !isValidMoney(openingFloat || '0')
                  }
                  onClick={() =>
                    run(
                      async () => {
                        await openPosSession({
                          openingCash:
                            openingFloat === '' ? 0 : Number(openingFloat),
                          openingNote,
                          idempotencyKey:
                            openingRequestRef.current ??
                            (openingRequestRef.current = crypto.randomUUID()),
                        }).then((opened) => {
                          if (opened.status === 'cashier_shift_open')
                            throw new Error(
                              `You already have an open shift on ${opened.terminalName ?? 'another register'}. End and reconcile it before opening another register.`
                            );
                          if (opened.status === 'cashier_shift_closing')
                            throw new Error(
                              `You already have a shift being reconciled on ${opened.terminalName ?? 'another register'}. Finish or cancel that reconciliation before opening another register.`
                            );
                          if (opened.status === 'terminal_reconciling')
                            throw new Error(
                              'This register is being reconciled. Finish that shift before opening a new one.'
                            );
                          if (opened.status === 'terminal_active')
                            throw new Error(
                              'This register already has an active shift. Ask the current cashier or a manager to close it first.'
                            );
                        });
                        setOpeningFloat('');
                        setOpeningNote('');
                        openingRequestRef.current = null;
                        setOpeningOpen(false);
                        router.refresh();
                      },
                      {
                        loading: 'Opening shiftâ€¦',
                        success: 'Shift opened',
                        description: 'Register is ready for sales.',
                      }
                    )
                  }
                >
                  <span data-open-register-submit="true">Open register</span>
                </Button>
              </DialogFooter>
            </>
          ) : (
            <DialogFooter className="border-t border-border pt-3 sm:justify-end">
              <Button variant="outline" onClick={() => setOpeningOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          )}
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
                run(
                  async () => {
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
                  },
                  {
                    loading: 'Recording cash movementâ€¦',
                    success: 'Cash movement recorded',
                    description: `${movementType === 'cash_in' ? 'Cash in' : movementType === 'cash_out' ? 'Cash out' : 'Safe drop'} of ${money(Number(movementAmount))} was recorded.`,
                  }
                )
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
                    run(
                      async () => {
                        if (!session) return;
                        const submitted = await submitPosSessionCount({
                          countedCash: Number(countedCash),
                          sessionId: session.id,
                        });
                        setResult(submitted);
                        setCloseStep('result');
                      },
                      {
                        loading: 'Closing shiftâ€¦',
                        success: 'Shift closed',
                        description: 'Reconciliation was saved successfully.',
                      }
                    )
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
                      const closed = await completePosSessionClose({
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
                      if (closed.posSessionEnded) {
                        router.replace('/sign-in?pos=1');
                        router.refresh();
                        return;
                      }
                      // Close the review immediately. Fetch the authoritative
                      // closed-register model on the next event-loop turn so
                      // route work never holds the cashier in this dialog.
                      setTimeout(() => router.refresh(), 0);
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
              .replace(/(\.\d{2}).*/, '$1')
          )
        }
        placeholder="0.00"
      />
    </div>
  );
}
function isValidMoney(value: string) {
  return /^(?:0|[1-9]\d*)(?:\.\d{0,2})?$/.test(value);
}

// Presentation only: account names remain unchanged in the database.
function formatPersonName(value: string | null) {
  if (!value) return null;
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/(^|[\s'-])[\p{L}]/gu, (letter) => letter.toLocaleUpperCase());
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
function SummaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#ead28a] bg-white/65 text-[#9a6900] dark:border-amber-400/20 dark:bg-white/5 dark:text-amber-300">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--dashboard-muted)]">
          {label}
        </dt>
        <dd
          className="mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums tracking-[-0.01em] text-[var(--dashboard-text)]"
          title={value}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
