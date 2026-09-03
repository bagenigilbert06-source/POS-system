'use client';

import { useEffect, useState, type HTMLAttributes } from 'react';

type LoadingSpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
};

/** The single, theme-aware loading indicator used throughout Pesaby. */
export function LoadingSpinner({
  className = '',
  label,
  ...props
}: LoadingSpinnerProps) {
  return (
    <span
      className={`pesaby-loader ${className}`.trim()}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    />
  );
}

export function PageLoader({
  label = 'Loading Pesaby',
  initial = false,
  inline = false,
}: {
  label?: string;
  initial?: boolean;
  inline?: boolean;
}) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!initial) return;

    // Wait for the document to be ready and keep a short minimum display time
    // so fast navigations do not flash the veil on screen.
    const startedAt = performance.now();
    let timeout: number | undefined;
    let fallback: number | undefined;
    const dismiss = () => {
      const remaining = Math.max(0, 350 - (performance.now() - startedAt));
      timeout = window.setTimeout(() => setIsDismissed(true), remaining);
    };

    if (document.readyState === 'complete') dismiss();
    else window.addEventListener('load', dismiss, { once: true });
    // A blocked third-party resource must never leave the whole application
    // behind an input-blocking loading veil. The page is already interactive
    // by the time this client component mounts, so this is only a safety net.
    fallback = window.setTimeout(dismiss, 1_000);

    return () => {
      window.removeEventListener('load', dismiss);
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };
  }, [initial]);

  return (
    <div
      className={`pesaby-global-loader${inline ? ' pesaby-inline-loader' : ''}${isDismissed ? ' pesaby-global-loader--dismissed' : ''}`}
      data-pesaby-initial-loader={initial ? '' : undefined}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <LoadingSpinner className="pesaby-loader--page" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
