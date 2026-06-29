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
  iconBg = 'bg-blue-100',
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
  const trendColor = trend?.direction === 'up' ? 'text-green-600' : trend?.direction === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div
      onClick={onClick}
      className={`${bgColor} rounded-lg border border-gray-200 p-6 shadow-sm transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900">{displayValue}</p>
          )}

          {trend && (
            <div className="mt-3 flex items-center gap-2">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={`text-sm font-medium ${trendColor}`}>
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              {trend.label && <span className="text-xs text-gray-500">{trend.label}</span>}
            </div>
          )}
        </div>

        {icon && <div className={`${iconBg} rounded-lg p-3 text-blue-600`}>{icon}</div>}
      </div>
    </div>
  );
}

// Loading skeleton
export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-20 rounded bg-gray-200" />
        <div className="h-8 w-32 rounded bg-gray-200" />
        <div className="h-4 w-24 rounded bg-gray-200" />
      </div>
    </div>
  );
}
