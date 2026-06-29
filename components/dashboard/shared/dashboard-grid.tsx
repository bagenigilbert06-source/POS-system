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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
          </div>
          {action && <div className="mt-4 sm:mt-0">{action}</div>}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        {children}
      </div>
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
    <div className="mb-6">
      {/* Section Header */}
      {(title || action) && (
        <div className="mb-4 flex flex-col justify-between sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
          </div>
          {action && <div className="mt-2 sm:mt-0">{action}</div>}
        </div>
      )}

      {/* Section Content */}
      {children}
    </div>
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
      <div className="animate-pulse rounded-lg border border-gray-200 bg-white">
        <div className="space-y-4 p-6">
          <div className="h-6 w-24 rounded bg-gray-200" />
          <div className="h-32 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Card Header */}
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
          </div>
          {action}
        </div>
      )}

      {/* Card Content */}
      <div className={!noPadding ? 'p-6' : ''}>
        {children}
      </div>
    </div>
  );
}
