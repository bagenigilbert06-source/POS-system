'use client';

import { useState, useTransition } from 'react';
import { notify } from '@/lib/notify';
import { updateCashVarianceTolerance } from '@/app/actions/operations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings2 } from 'lucide-react';

export function VariancePolicy({
  initialTolerance,
  currency,
}: {
  initialTolerance: number;
  currency: string;
}) {
  const [value, setValue] = useState(String(initialTolerance));
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      try {
        const result = await updateCashVarianceTolerance(Number(value));
        setValue(result.cashVarianceTolerance.toFixed(2));
        notify.success('Variance policy saved');
      } catch (error) {
        notify.error(
          error instanceof Error
            ? error.message
            : 'Unable to save variance policy'
        );
      }
    });
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff7d6] text-[#9a6700] dark:bg-[rgba(255,214,10,.1)] dark:text-[#ffd60a]">
            <Settings2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold">Cash variance policy</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              Differences at or below this amount do not require a reason during
              reconciliation. Changes are permission-controlled and audit
              logged.
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Tolerance ({currency})</span>
            <Input
              className="h-9 w-32 bg-background text-sm"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <Button
            disabled={pending || Number(value) < 0 || value === ''}
            className="h-9"
            onClick={save}
          >
            {pending ? 'Saving…' : 'Save policy'}
          </Button>
        </div>
      </div>
    </section>
  );
}
