'use client';

import { Check, ChevronDown } from 'lucide-react';

export type DashboardPeriodOption<T extends string | number> = {
  value: T;
  label: string;
};

interface DashboardPeriodSelectProps<T extends string | number> {
  value: T;
  options: DashboardPeriodOption<T>[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: T) => void;
  ariaLabel: string;
  minWidthClassName?: string;
}

export function DashboardPeriodSelect<T extends string | number>({
  value,
  options,
  open,
  onOpenChange,
  onValueChange,
  ariaLabel,
  minWidthClassName = 'min-w-[104px]',
}: DashboardPeriodSelectProps<T>) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => onOpenChange(!open)}
        className={`flex h-8 ${minWidthClassName} items-center justify-between gap-2 rounded-md border-0 bg-transparent px-2.5 text-[0.7rem] font-semibold text-[var(--dashboard-text)] outline-none transition-colors hover:bg-[var(--dashboard-surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-soft-border)] ${open ? 'bg-[var(--dashboard-surface-subtle)]' : ''}`}
      >
        <span>{selected?.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[var(--dashboard-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-full overflow-hidden rounded-lg bg-[var(--dashboard-surface)] p-1 shadow-[0_10px_28px_rgba(0,0,0,.14)]"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onValueChange(option.value);
                  onOpenChange(false);
                }}
                className={`flex w-full items-center justify-between gap-4 rounded-md px-2.5 py-2 text-left text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent-soft-border)] ${active ? 'bg-[var(--dashboard-surface-subtle)] font-semibold text-[var(--dashboard-text)]' : 'font-medium text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-subtle)] hover:text-[var(--dashboard-text)]'}`}
              >
                {option.label}
                {active && (
                  <Check className="h-3.5 w-3.5 text-[var(--dashboard-accent)]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
