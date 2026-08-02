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
  bgColor = 'bg-white',
  iconBg = 'bg-[#efffd0]',
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
      className={`${bgColor} rounded-2xl border border-[#e1e6db] p-4 shadow-[0_8px_20px_rgba(35,37,34,.04)] transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#74776f]">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-2 truncate text-2xl font-bold tracking-[-0.035em] text-[#151514] sm:text-3xl">{displayValue}</p>
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

        {icon && <div className={`${iconBg} rounded-xl p-2.5 text-[#557b14]`}>{icon}</div>}
      </div>
    </div>
  );
}

// Loading skeleton
export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#e1e6db] bg-white p-5 shadow-[0_8px_20px_rgba(35,37,34,.04)]">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-20 rounded bg-muted" />
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}
