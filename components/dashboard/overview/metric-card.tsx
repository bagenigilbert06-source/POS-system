import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type MetricTrend = {
  direction: 'up' | 'down' | 'neutral';
  value?: number;
  label?: string;
  text?: string;
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
  href?: string;
  trend?: MetricTrend;
  primaryMeta?: string;
  status?: string;
  warning?: boolean;
  healthy?: boolean;
  loading?: boolean;
  linkLabel?: string;
}

function TrendLine({ trend }: { trend: MetricTrend }) {
  const Icon =
    trend.direction === 'up'
      ? ArrowUp
      : trend.direction === 'down'
        ? ArrowDown
        : Minus;

  return (
    <p
      className={cn(
        'flex min-h-5 items-center gap-1 text-xs font-medium',
        trend.direction === 'up' && 'text-[var(--dashboard-success)]',
        trend.direction === 'down' && 'text-[var(--dashboard-danger)]',
        trend.direction === 'neutral' && 'text-[var(--dashboard-muted)]'
      )}
      aria-label={
        trend.direction === 'up'
          ? 'Performance increased compared with yesterday'
          : trend.direction === 'down'
            ? 'Performance decreased compared with yesterday'
            : 'No change compared with yesterday'
      }
    >
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span>
        {trend.text ??
          `${trend.direction === 'up' ? '+' : '−'}${trend.value?.toFixed(1)}% ${trend.label ?? ''}`}
      </span>
    </p>
  );
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  href,
  trend,
  primaryMeta,
  status,
  warning,
  healthy,
  loading,
  linkLabel = 'View details',
}: MetricCardProps) {
  const compactValue = value.length > 16;
  const iconTone = warning
    ? 'border-amber-500/25 bg-amber-500/10 text-amber-500'
    : healthy
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500'
      : 'border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] group-hover:border-[var(--dashboard-accent-soft-border)] group-hover:text-[var(--dashboard-accent)]';

  const card = (
    <Card
      className={cn(
        'group relative flex h-full min-h-[164px] flex-col overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-dark-sm transition-[border-color,box-shadow] duration-150',
        href && 'hover:border-[var(--dashboard-accent-soft-border)]'
      )}
    >
      <CardHeader className="relative z-[1] flex-row items-start justify-between space-y-0 px-4 pb-0 pt-4">
        {loading ? (
          <Skeleton className="h-4 w-28 bg-[var(--dashboard-surface-subtle)]" />
        ) : (
          <p className="pt-0.5 text-[0.72rem] font-semibold text-[var(--dashboard-muted)]">
            {title}
          </p>
        )}
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
            iconTone
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
        </span>
      </CardHeader>

      <CardContent className="relative z-[1] flex flex-1 flex-col px-4 pb-4 pt-2">
        {loading ? (
          <>
            <Skeleton className="h-8 w-32 bg-[var(--dashboard-surface-subtle)]" />
            <Skeleton className="mt-3 h-4 w-36 bg-[var(--dashboard-surface-subtle)]" />
            <Skeleton className="mt-2 h-4 w-28 bg-[var(--dashboard-surface-subtle)]" />
          </>
        ) : (
          <>
            <p
              className={cn(
                'truncate font-semibold leading-[1.08] tracking-[-0.025em] tabular-nums',
                compactValue ? 'text-[1.25rem]' : 'text-[1.5rem]'
              )}
              title={value}
            >
              {value}
            </p>
            <div className="mt-auto pt-3">
              {status ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 rounded-md border px-2 text-[0.64rem] font-semibold shadow-none',
                    warning
                      ? 'border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]'
                      : 'border-[var(--dashboard-success-soft-border)] bg-[var(--dashboard-success-soft)] text-[var(--dashboard-success)]'
                  )}
                >
                  {status}
                </Badge>
              ) : trend ? (
                <TrendLine trend={trend} />
              ) : primaryMeta ? (
                <p className="min-h-5 text-xs font-medium text-[var(--dashboard-muted)]">
                  {primaryMeta}
                </p>
              ) : null}
            </div>
            <p className="mt-1.5 line-clamp-2 min-h-4 text-[0.7rem] leading-4 text-[var(--dashboard-muted)]">
              {description}
            </p>
          </>
        )}

        {href && !loading && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="absolute bottom-3.5 right-3.5 flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.64rem] font-semibold text-[var(--dashboard-muted)] opacity-70 transition-colors group-hover:text-[var(--dashboard-accent)] group-hover:opacity-100 group-focus-within:text-[var(--dashboard-accent)] group-focus-within:opacity-100"
                  aria-hidden="true"
                >
                  <span>{linkLabel}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] text-[var(--dashboard-text)] shadow-lg">
                View details
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link
      href={href}
      aria-label={`View ${title} details`}
      className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  ) : (
    card
  );
}

export function MetricCardSkeleton() {
  return (
    <MetricCard
      title="Loading metric"
      value=""
      icon={Minus}
      description=""
      loading
    />
  );
}
