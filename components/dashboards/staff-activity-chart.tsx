'use client';

import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface StaffActivityChartProps {
  data: Array<{
    hour: string;
    activeStaff: number;
    sales: number;
    transactions: number;
  }>;
  currency: string;
}

export function StaffActivityChart({
  data,
  currency,
}: StaffActivityChartProps) {
  const chartData =
    data.length > 0
      ? data
      : Array.from({ length: 24 }, (_, i) => ({
          hour: `${String(i).padStart(2, '0')}:00`,
          activeStaff: 0,
          sales: 0,
          transactions: 0,
        }));

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[var(--dashboard-border)] px-5 py-4 sm:px-6">
        <h2 className="text-[0.95rem] font-bold text-[var(--dashboard-text)]">
          Staff Activity Pattern
        </h2>
        <p className="mt-1 text-xs text-[var(--dashboard-muted)]">
          Active staff and transactions by hour today
        </p>
      </div>
      <div className="p-4 sm:p-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--dashboard-chart-grid)"
            />
            <XAxis dataKey="hour" stroke="var(--dashboard-chart-tick)" />
            <YAxis stroke="var(--dashboard-chart-tick)" yAxisId="left" />
            <Tooltip
              cursor={false}
              contentStyle={{
                backgroundColor: 'var(--dashboard-chart-tooltip)',
                border: '1px solid var(--dashboard-border)',
                color: 'var(--dashboard-text)',
              }}
              formatter={(value: any, _name: any, item: any) => {
                if (item?.dataKey === 'sales')
                  return [formatCurrency(value, currency), 'Sales'];
                if (item?.dataKey === 'activeStaff')
                  return [formatNumber(value), 'Active staff'];
                return [formatNumber(value), 'Transactions'];
              }}
            />
            <Legend wrapperStyle={{ color: 'var(--dashboard-text)' }} />
            <Area
              type="monotone"
              dataKey="activeStaff"
              stroke="var(--dashboard-chart-active)"
              fill="var(--dashboard-chart-active)"
              fillOpacity={0.16}
              name="Active Staff"
              yAxisId="left"
              dot={false}
            />
            <Line
              dataKey="transactions"
              type="monotone"
              stroke="var(--dashboard-chart-transactions)"
              name="Transactions"
              yAxisId="left"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
