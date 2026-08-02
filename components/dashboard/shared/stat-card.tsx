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
  iconBg = 'bg-[#fff3be]',
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
      className={`rounded-lg border border-[#27272a] dark:bg-[#111827] dark:text-[#fafafa] p-5 sm:p-6 card-elevation-2 transition-all hover:card-elevation-3 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#a1a1aa] dark:text-[#a1a1aa]">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-[#27272a]" />
          ) : (
            <p className="mt-2 truncate text-3xl font-bold tracking-tight dark:text-[#fafafa]">{displayValue}</p>
          )}

          {trend && (
            <div className="mt-3 flex items-center gap-2">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={`text-sm font-medium ${trendColor}`}>
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && <span className="text-xs text-[#a1a1aa] dark:text-[#a1a1aa]">{trend.label}</span>}
            </div>
          )}
        </div>

        {icon && <div className={`dark:bg-[#22c55e]/15 dark:text-[#22c55e] rounded-lg p-3 text-[#0b0b0d]`}>{icon}</div>}
      </div>
    </div>
  );
}

// Loading skeleton
export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#27272a] dark:bg-[#111827] p-6 card-elevation-2">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-20 rounded bg-[#27272a]" />
        <div className="h-8 w-32 rounded bg-[#27272a]" />
        <div className="h-4 w-24 rounded bg-[#27272a]" />
      </div>
    </div>
  );
}
