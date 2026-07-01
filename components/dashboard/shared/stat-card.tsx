/**
 * StatCard Component
 * Reusable card for displaying KPI statistics with trend indicators
 */

import { ReactNode } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { formatCurrency, formatCompactNumber } from '@/lib/utils/format';

interface StatCardProps {
  title: string;
  value: string | number;
  format?: 'currency' | 'number' | 'compact' | 'text';
  currency?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: ReactNode;
  bgColor?: string;
  iconBg?: string;
  onClick?: () => void;
  loading?: boolean;
  suffix?: string;
  prefix?: string;
}

export function StatCard({
  title,
  value,
  format = 'text',
  currency = 'KES',
  trend,
  icon,
  bgColor = 'bg-white dark:bg-card',
  iconBg = 'bg-[#e4efe7]',
  onClick,
  loading = false,
  suffix,
  prefix,
}: StatCardProps) {
  const formatValue = (val: string | number): string => {
    if (format === 'currency') {
      return formatCurrency(typeof val === 'string' ? parseFloat(val) : val, currency);
    }
    if (format === 'number') {
      return formatCompactNumber(typeof val === 'string' ? parseFloat(val) : val);
    }
    if (format === 'compact') {
      return formatCompactNumber(typeof val === 'string' ? parseFloat(val) : val);
    }
    return String(val);
  };

  const displayValue = `${prefix || ''}${formatValue(value)}${suffix || ''}`;

  const TrendIcon = trend?.direction === 'up' ? ArrowUp : trend?.direction === 'down' ? ArrowDown : Minus;
  const trendColor = trend?.direction === 'up' ? 'text-[#1f7a3f]' : trend?.direction === 'down' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div
      onClick={onClick}
      className={`${bgColor} rounded-lg border border-border p-4 shadow-sm transition-all hover:shadow-md sm:p-5 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{displayValue}</p>
          )}

          {trend && (
            <div className="mt-3 flex items-center gap-2">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={`text-sm font-medium ${trendColor}`}>
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && <span className="text-xs text-muted-foreground">{trend.label}</span>}
            </div>
          )}
        </div>

        {icon && <div className={`${iconBg} rounded-md p-2.5 text-[#1f5132] dark:text-primary`}>{icon}</div>}
      </div>
    </div>
  );
}

// Loading skeleton
export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-20 rounded bg-muted" />
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}
