'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeSwitcher({ circular = false }: { circular?: boolean }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn('h-10 w-10', circular && 'rounded-full')} />;
  }

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const currentTheme = themes.find((t) => t.value === theme);
  const CurrentIcon = currentTheme?.icon || Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center border-0 !border-transparent bg-transparent text-[#a47700] shadow-none outline-none ring-0 transition-colors hover:bg-[#fff4bf] hover:text-[#795900] focus:!border-transparent focus:!outline-none focus:!ring-0 focus-visible:!outline-none dark:text-[#ffd60a] dark:hover:bg-[#2b240d] dark:hover:text-[#ffe66b]',
            circular
              ? 'rounded-full bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:!ring-2 focus-visible:!ring-[var(--dashboard-accent)] focus-visible:ring-offset-2'
              : 'rounded-lg focus-visible:!border-transparent focus-visible:!ring-0'
          )}
          aria-label="Toggle theme"
        >
          <CurrentIcon className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-0 shadow-lg">
        {themes.map((t) => {
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={
                theme === t.value
                  ? 'bg-[#fff4bf] text-[#795900] dark:bg-[#2b240d] dark:text-[#ffd60a]'
                  : ''
              }
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>
                {t.label}
                {t.value === 'system' && theme === 'system'
                  ? ` (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`
                  : ''}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
