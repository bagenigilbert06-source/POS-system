'use client';

import { Users, TrendingUp, Target } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface StaffMetricsCardsProps {
  metrics: {
    totalStaff: number;
    activeStaff: number;
    totalSalesValue: number;
    totalTransactions: number;
    avgPerStaff: number;
  };
  currency: string;
}

export function StaffMetricsCards({
  metrics,
  currency,
}: StaffMetricsCardsProps) {
  const cards = [
    {
      label: 'Total Staff',
      value: formatNumber(metrics.totalStaff),
      detail: 'In organization',
      icon: Users,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300',
    },
    {
      label: 'Active Today',
      value: formatNumber(metrics.activeStaff),
      detail: 'Made sales today',
      icon: TrendingUp,
      color:
        'bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-300',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(metrics.totalSalesValue, currency),
      detail: 'Net revenue from all paid sales',
      icon: Target,
      color:
        'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300',
    },
    {
      label: 'Transactions',
      value: formatNumber(metrics.totalTransactions),
      detail: 'All completed sales',
      icon: TrendingUp,
      color:
        'bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300',
    },
    {
      label: 'Avg Sales/Staff',
      value: formatCurrency(metrics.avgPerStaff, currency),
      detail: 'Per staff member with sales',
      icon: Target,
      color: 'bg-pink-100 text-pink-600 dark:bg-pink-950/60 dark:text-pink-300',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_1px_2px_rgba(16,24,40,.03)]"
          >
            <div className="px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--dashboard-muted)]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-lg font-bold text-[var(--dashboard-text)]">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--dashboard-muted)]">
                    {card.detail}
                  </p>
                </div>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
