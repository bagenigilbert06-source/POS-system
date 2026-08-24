'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Clock3 } from 'lucide-react';
import { formatNumber } from '@/lib/utils/format';

interface StaffActivityChartProps {
  data: Array<{
    hour: string;
    activeStaff: number;
    sales: number;
    transactions: number;
  }>;
  currency: string;
}

function formatHour(value: string) {
  const hour = Number(value.slice(0, 2));
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
}

export function StaffActivityChart({ data }: StaffActivityChartProps) {
  const chartData = Array.from({ length: 24 }, (_, hour) => {
    const key = `${String(hour).padStart(2, '0')}:00`;
    return (
      data.find((item) => item.hour === key) ?? {
        hour: key,
        activeStaff: 0,
        sales: 0,
        transactions: 0,
      }
    );
  });
  const totalTransactions = chartData.reduce(
    (total, item) => total + item.transactions,
    0
  );
  const peak = chartData.reduce((best, item) =>
    item.transactions > best.transactions ? item : best
  );
  const hasActivity = totalTransactions > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--dashboard-border)] px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-500">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[0.95rem] font-bold text-[var(--dashboard-text)]">
                Staff Activity Pattern
              </h2>
              <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">
                Transaction activity by hour across all recorded sales
              </p>
            </div>
          </div>
        </div>
        {hasActivity && (
          <div className="flex items-center gap-4 text-xs">
            <div>
              <p className="text-[var(--dashboard-muted)]">Transactions</p>
              <p className="mt-0.5 font-bold tabular-nums text-[var(--dashboard-text)]">
                {formatNumber(totalTransactions)}
              </p>
            </div>
            <div className="border-l border-[var(--dashboard-border)] pl-4">
              <p className="text-[var(--dashboard-muted)]">Peak hour</p>
              <p className="mt-0.5 font-bold text-[var(--dashboard-text)]">
                {formatHour(peak.hour)}
              </p>
            </div>
          </div>
        )}
      </div>

      {hasActivity ? (
        <div className="px-3 pb-4 pt-5 sm:px-5">
          <div className="mb-4 flex items-center gap-5 px-2 text-[0.7rem] font-medium text-[var(--dashboard-muted)]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--dashboard-chart-transactions)]" />
              Transactions
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--staff-chart-active)] ring-2 ring-[var(--dashboard-surface)]" />
              Staff active
            </span>
          </div>
          <div className="px-1 pb-1" aria-label="Hourly staff transaction activity chart">
            <div className="h-[238px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 6, right: 8, bottom: 0, left: -8 }}
                  barCategoryGap="28%"
                >
                <defs>
                  <linearGradient id="staffActivityBars" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--dashboard-chart-transactions)" stopOpacity={1} />
                    <stop offset="100%" stopColor="var(--dashboard-chart-transactions)" stopOpacity={0.48} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="2 6"
                  stroke="var(--dashboard-chart-grid)"
                />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                  minTickGap={14}
                  tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }}
                  tickFormatter={formatHour}
                  dy={8}
                />
                <YAxis
                  yAxisId="transactions"
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: 'var(--dashboard-chart-tick)', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="staff"
                  orientation="right"
                  hide
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--dashboard-surface-subtle)', opacity: 0.45 }}
                  contentStyle={{
                    backgroundColor: 'var(--dashboard-chart-tooltip)',
                    border: '1px solid var(--dashboard-border)',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(0,0,0,.18)',
                    color: 'var(--dashboard-text)',
                    fontSize: '12px',
                  }}
                  labelStyle={{
                    color: 'var(--dashboard-text)',
                    fontWeight: 700,
                    marginBottom: '6px',
                  }}
                  labelFormatter={(label) => formatHour(String(label))}
                  formatter={(value, name) => [
                    formatNumber(Number(value ?? 0)),
                    name,
                  ]}
                />
                <Bar
                  yAxisId="transactions"
                  dataKey="transactions"
                  name="Transactions"
                  fill="url(#staffActivityBars)"
                  radius={[6, 6, 3, 3]}
                  maxBarSize={22}
                />
                <Line
                  yAxisId="staff"
                  dataKey="activeStaff"
                  name="Staff active"
                  type="monotone"
                  stroke="transparent"
                  strokeWidth={0}
                  dot={(props: any) =>
                    props.payload?.activeStaff > 0 ? (
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={3.5}
                        fill="var(--staff-chart-active)"
                        stroke="var(--dashboard-surface)"
                        strokeWidth={2}
                      />
                    ) : null
                  }
                  activeDot={{
                    r: 5,
                    fill: 'var(--staff-chart-active)',
                    stroke: 'var(--dashboard-surface)',
                    strokeWidth: 2,
                  }}
                />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[325px] flex-col items-center justify-center px-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)]">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--dashboard-text)]">
            No transaction activity yet
          </p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--dashboard-muted)]">
            Hourly staff activity will appear after the first completed sale.
          </p>
        </div>
      )}
    </div>
  );
}
