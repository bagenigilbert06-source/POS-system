/**
 * DashboardGrid Component
 * Responsive grid layout for dashboard widgets
 * Responsive: 1 column on mobile, 2 on tablet, 4 on desktop
 */

import { ReactNode } from 'react';

interface GridItemProps {
  span?: number; // 1-4 (corresponds to grid columns)
  children: ReactNode;
  className?: string;
}

interface DashboardGridProps {
  children: ReactNode;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SPAN_CLASSES = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-2 lg:col-span-3',
  4: 'col-span-1 md:col-span-2 lg:col-span-4',
};

const GAP_CLASSES = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

export function DashboardGrid({ children, gap = 'md', className = '' }: DashboardGridProps) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${GAP_CLASSES[gap]} ${className}`}
    >
      {children}
    </div>
  );
}

export function GridItem({ span = 1, children, className = '' }: GridItemProps) {
  const spanClass = SPAN_CLASSES[Math.min(span, 4) as keyof typeof SPAN_CLASSES];

  return (
    <div className={`${spanClass} ${className}`}>
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 4 },
  gap = 'md',
}: ResponsiveGridProps) {
  const colClasses = `
    grid-cols-${columns.mobile || 1}
    ${columns.tablet ? `md:grid-cols-${columns.tablet}` : ''}
    ${columns.desktop ? `lg:grid-cols-${columns.desktop}` : ''}
  `;

  return (
    <div className={`grid ${colClasses} ${GAP_CLASSES[gap]}`}>
      {children}
    </div>
  );
}

/**
 * Dashboard Page Container
 * Wraps entire dashboard page with proper spacing and layout
 */
interface DashboardPageProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function DashboardPage({ title, description, children, action }: DashboardPageProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <div className="rounded-lg border border-border bg-white px-4 py-4 shadow-sm dark:bg-card sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      </div>

      {children}
    </div>
  );
}

/**
 * Dashboard Section
 * Wrapper for related dashboard content
 */
interface DashboardSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function DashboardSection({
  title,
  description,
  action,
  children,
}: DashboardSectionProps) {
  return (
    <section className="space-y-4">
      {(title || action) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}

      {children}
    </section>
  );
}

/**
 * Dashboard Card Container
 * Used to wrap widget content
 */
interface DashboardCardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  loading?: boolean;
  children: ReactNode;
  noPadding?: boolean;
}

export function DashboardCard({
  title,
  description,
  action,
  loading = false,
  children,
  noPadding = false,
}: DashboardCardProps) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-lg border border-border bg-card">
        <div className="space-y-4 p-6">
          <div className="h-6 w-24 rounded bg-muted" />
          <div className="h-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm dark:bg-card">
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}

      <div className={!noPadding ? 'p-4 sm:p-5' : ''}>
        {children}
      </div>
    </div>
  );
}
