import Link from 'next/link';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const errorMessages: Record<string, string> = {
  INVALID_TOKEN: 'This verification link is invalid or has already been used.',
  TOKEN_EXPIRED: 'This verification link has expired.',
  USER_NOT_FOUND: 'We could not find the account for this verification link.',
};

export function EmailVerificationNotice({ error }: { error?: string }) {
  const failed = Boolean(error);
  const message = error
    ? errorMessages[error] ||
      'We could not verify this email address. Please request a new link.'
    : 'Your email address is verified and your account security is up to date.';

  return (
    <section
      role={failed ? 'alert' : 'status'}
      className={`mx-auto mb-4 flex w-full max-w-[1440px] items-start gap-3 rounded-xl border px-4 py-3 shadow-dark-sm ${
        failed
          ? 'border-[var(--dashboard-danger-soft-border)] bg-[var(--dashboard-danger-soft)]'
          : 'border-[var(--dashboard-success-soft-border)] bg-[var(--dashboard-success-soft)]'
      }`}
    >
      {failed ? (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dashboard-danger)]" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--dashboard-success)]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--dashboard-text)]">
          {failed ? 'Email verification unsuccessful' : 'Email verified'}
        </p>
        <p className="mt-0.5 text-sm text-[var(--dashboard-muted)]">
          {message}
        </p>
        {failed && (
          <Link
            href="/dashboard/profile"
            className="mt-2 inline-flex text-sm font-semibold text-[var(--dashboard-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]"
          >
            Request a new verification email
          </Link>
        )}
      </div>
      <Link
        href="/dashboard"
        aria-label="Dismiss email verification message"
        className="rounded-md p-1 text-[var(--dashboard-muted)] transition-colors hover:bg-black/10 hover:text-[var(--dashboard-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]"
      >
        <X className="h-4 w-4" />
      </Link>
    </section>
  );
}
