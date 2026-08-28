'use client';

import { useMemo, useState } from 'react';
import { CircleCheck, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export type OperationalActivityItem = {
  id: string;
  category: 'shifts' | 'cash' | 'refunds' | 'inventory' | 'overrides';
  title: string;
  detail: string;
  actor: string;
  time: string;
  timestamp: number;
  value?: string;
  status: string;
};

const filters = [
  'all',
  'shifts',
  'cash',
  'refunds',
  'inventory',
  'overrides',
] as const;

export function OperationalActivity({
  items,
}: {
  items: OperationalActivityItem[];
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');
  const [query, setQuery] = useState('');
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (filter === 'all' || item.category === filter) &&
          `${item.title} ${item.detail} ${item.actor} ${item.status}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [filter, items, query]
  );

  return (
    <section
      id="operational-activity"
      className="scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#9a6700] dark:text-[#ffd60a]">
            Audit trail
          </p>
          <h2 className="mt-1 text-lg font-bold">Operational activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A single chronological feed of shift, cash, refund, and inventory
            events.
          </p>
        </div>
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search activity"
            className="pl-9"
          />
        </div>
      </div>
      <div
        className="flex gap-1 overflow-x-auto border-b px-4 py-2"
        aria-label="Activity categories"
      >
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${filter === item ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {item}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className="divide-y">
          {visible.map((item) => (
            <article
              key={`${item.category}-${item.id}`}
              className="grid gap-2 px-5 py-3.5 hover:bg-muted/20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[0.62rem] font-semibold capitalize text-muted-foreground">
                    {item.status.replaceAll('_', ' ')}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {item.detail} · {item.actor}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                {item.value && (
                  <p className="text-xs font-semibold tabular-nums">
                    {item.value}
                  </p>
                )}
                <time className="text-[0.68rem] text-muted-foreground">
                  {item.time}
                </time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center p-8 text-center">
          <CircleCheck className="h-7 w-7 text-emerald-600" />
          <p className="mt-3 text-sm font-semibold">No matching activity</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try another category or search.
          </p>
        </div>
      )}
    </section>
  );
}
