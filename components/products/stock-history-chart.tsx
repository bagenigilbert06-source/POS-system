'use client';

import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from '@/components/providers/theme-provider';

type StockPoint = { date: string; stock: number };

export function StockHistoryChart({ data, unit, alertLevel }: { data: StockPoint[]; unit: string; alertLevel?: number }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const gradientId = useId().replace(/:/g, '');
  const showAlertLine = typeof alertLevel === 'number' && alertLevel > 0;
  const chartData = useMemo(() => data.map((point, index) => ({ ...point, pointId: `${point.date}-${index}` })), [data]);
  const yMax = Math.max(1, ...data.map((point) => point.stock), showAlertLine ? alertLevel : 0);
  const yDomainMax = Math.max(2, Math.ceil((yMax + 1) / 2) * 2);

  if (data.length === 0) return <p className="py-8 text-sm text-muted-foreground">Stock history will appear after the first movement.</p>;

  return <div className="space-y-4 font-sans" role="img" aria-label={`Stock level trend in ${unit}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-[#101828] dark:text-slate-100">Inventory trend</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Stock remaining after each recorded movement</p>
      </div>
      {showAlertLine && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300">Reorder level: {alertLevel} {unit}</span>}
    </div>
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d6a800" stopOpacity={isDark ? 0.3 : 0.22} /><stop offset="100%" stopColor="#d6a800" stopOpacity={0.02} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke={isDark ? '#363636' : '#e5e9ef'} strokeDasharray="3 4" />
          <XAxis dataKey="pointId" tickFormatter={(_, index) => index === 0 || chartData[index - 1]?.date !== chartData[index]?.date ? chartData[index]?.date : ''} interval="preserveStartEnd" minTickGap={28} tick={{ fontSize: 11, fill: isDark ? '#a3a3a3' : '#667085' }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} domain={[0, yDomainMax]} width={30} tick={{ fontSize: 11, fill: isDark ? '#a3a3a3' : '#667085' }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ stroke: isDark ? '#737373' : '#98a2b3', strokeDasharray: '4 4' }} labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''} formatter={(value) => [`${value} ${unit}`, 'Available stock']} contentStyle={{ backgroundColor: isDark ? '#171717' : '#ffffff', border: `1px solid ${isDark ? '#363636' : '#e3e7ec'}`, borderRadius: 8, boxShadow: isDark ? '0 10px 24px rgba(0,0,0,.4)' : '0 8px 20px rgba(16,24,40,.12)', color: isDark ? '#fafafa' : '#101828', fontSize: 12 }} labelStyle={{ color: isDark ? '#a3a3a3' : '#667085' }} itemStyle={{ color: isDark ? '#f7c948' : '#9a6900', fontWeight: 600 }} />
          {showAlertLine && <ReferenceLine y={alertLevel} stroke="#d97706" strokeDasharray="5 5" />}
          <Area type="stepAfter" dataKey="stock" stroke={isDark ? '#f0bd2f' : '#b58100'} strokeWidth={2.25} fill={`url(#${gradientId})`} dot={{ r: 3, fill: isDark ? '#f0bd2f' : '#b58100', strokeWidth: 2, stroke: isDark ? '#0d0d0d' : '#ffffff' }} activeDot={{ r: 5, fill: '#d6a800', stroke: isDark ? '#0d0d0d' : '#ffffff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>;
}
