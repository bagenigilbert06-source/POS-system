'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Printer, RefreshCw } from 'lucide-react';
import { getDirectPrinterStatus } from '@/lib/printing/receipt-print-service';

type Status = 'connecting' | 'ready' | 'offline' | 'not-configured';

export function TerminalPrinterStatus({
  mode,
  printerName,
}: {
  mode: 'direct' | 'browser';
  printerName: string;
}) {
  const configuredName = printerName.trim();
  const [status, setStatus] = useState<Status>(
    mode === 'direct' && configuredName ? 'connecting' : 'not-configured'
  );

  const check = useCallback(async () => {
    if (mode !== 'direct' || !configuredName) {
      setStatus('not-configured');
      return;
    }
    setStatus('connecting');
    const result = await getDirectPrinterStatus(configuredName);
    setStatus(result === 'ready' ? 'ready' : 'offline');
  }, [configuredName, mode]);

  useEffect(() => {
    void check();
    const reconnect = () => void check();
    const reconnectWhenVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', reconnectWhenVisible);
    return () => {
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', reconnectWhenVisible);
    };
  }, [check]);

  const label =
    status === 'ready'
      ? 'Ready'
      : status === 'connecting'
        ? 'Connecting'
        : status === 'offline'
          ? 'Offline'
          : 'Not configured';

  return (
    <div
      className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--dashboard-muted)]"
      title={configuredName || 'Ask a manager to configure this terminal'}
    >
      {status === 'connecting' ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Printer className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">
        Printer{' '}
        <span
          className={
            status === 'ready'
              ? 'font-semibold text-emerald-700 dark:text-emerald-400'
              : status === 'offline'
                ? 'font-semibold text-amber-700 dark:text-amber-300'
                : 'font-semibold'
          }
        >
          {label}
        </span>
      </span>
      {status === 'offline' && (
        <button
          type="button"
          onClick={() => void check()}
          className="inline-flex shrink-0 items-center gap-1 font-semibold text-amber-700 hover:underline dark:text-amber-300"
          aria-label={`Retry ${configuredName} printer connection`}
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}
