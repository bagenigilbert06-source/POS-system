import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'

interface ComplianceStatusCardProps {
  verified: number
  needsReview: number
}

export function ComplianceStatusCard({ verified, needsReview }: ComplianceStatusCardProps) {
  const total = verified + needsReview
  const hasActivity = total > 0
  const healthy = hasActivity && needsReview === 0
  const verificationRate = hasActivity ? (verified / total) * 100 : null
  const StatusIcon = healthy ? CheckCircle2 : TriangleAlert
  const statusText = healthy
    ? 'All checkout checks complete'
    : needsReview > 0
      ? `${formatNumber(needsReview)} checkout ${needsReview === 1 ? 'review needs' : 'reviews need'} attention`
      : 'No verification activity today'

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-dark-sm">
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(240px,1fr)_auto_auto_auto] lg:items-center lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
            needsReview > 0
              ? 'border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]'
              : 'border-[var(--dashboard-success-soft-border)] bg-[var(--dashboard-success-soft)] text-[var(--dashboard-success)]',
          )}>
            {needsReview > 0 ? <TriangleAlert className="h-[18px] w-[18px]" aria-hidden="true" /> : <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[var(--dashboard-text)]">Compliance status</h2>
            <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">Age verification and checkout review status</p>
          </div>
        </div>

        {hasActivity ? (
          <div className="min-w-[112px] border-l-0 border-[var(--dashboard-border)] lg:border-l lg:pl-5">
            <p className="text-lg font-bold leading-none tabular-nums text-[var(--dashboard-text)]" aria-label={`${verificationRate?.toFixed(1)} percent of required sales verified`}>
              {verificationRate?.toFixed(1)}%
            </p>
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[var(--dashboard-muted)]">Verified today</p>
          </div>
        ) : (
          <div className="max-w-xs border-l-0 border-[var(--dashboard-border)] lg:border-l lg:pl-5">
            <p className="text-xs font-semibold text-[var(--dashboard-text)]">No verification activity today</p>
            <p className="mt-1 text-[0.68rem] leading-4 text-[var(--dashboard-muted)]">Status appears after eligible sales are completed.</p>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-2">
          <div className="min-w-[96px] rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-3 py-2">
            <dd className="text-base font-bold tabular-nums text-[var(--dashboard-text)]">{formatNumber(total)}</dd>
            <dt className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--dashboard-muted)]">Age checks</dt>
          </div>
          <div className={cn(
            'min-w-[96px] rounded-lg border px-3 py-2',
            needsReview > 0
              ? 'border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)]'
              : 'border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)]',
          )}>
            <dd className={cn('text-base font-bold tabular-nums', needsReview > 0 ? 'text-[var(--dashboard-accent)]' : 'text-[var(--dashboard-text)]')}>{formatNumber(needsReview)}</dd>
            <dt className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--dashboard-muted)]">Reviews needed</dt>
          </div>
        </dl>

        <div className="flex flex-col gap-2 lg:items-end">
          <p className={cn(
            'flex items-center gap-1.5 text-xs font-semibold',
            healthy ? 'text-[var(--dashboard-success)]' : needsReview > 0 ? 'text-[var(--dashboard-accent)]' : 'text-[var(--dashboard-muted)]',
          )}>
            <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {statusText}
          </p>
          <Link href="/dashboard/operations" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--dashboard-border)] px-3.5 text-xs font-semibold text-[var(--dashboard-text)] transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]">
            View controls <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}
