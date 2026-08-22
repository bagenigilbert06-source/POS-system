'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Building2,
  CreditCard,
  MonitorSmartphone,
  FileClock,
  KeyRound,
  Landmark,
  Settings,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

const sections: ReadonlyArray<{
  label: string;
  items: readonly AdminNavItem[];
}> = [
  {
    label: 'Business setup',
    items: [
      {
        label: 'Business profile',
        href: '/dashboard/admin/profile',
        icon: Settings,
      },
      {
        label: 'Branches & locations',
        href: '/dashboard/admin/branches',
        icon: Building2,
      },
      {
        label: 'Payment methods',
        href: '/dashboard/admin/payment-methods',
        icon: CreditCard,
      },
      {
        label: 'POS devices',
        href: '/dashboard/admin/devices',
        icon: MonitorSmartphone,
      },
    ],
  },
  {
    label: 'People & access',
    items: [
      {
        label: 'Staff accounts',
        href: '/dashboard/admin/staff',
        icon: UsersRound,
      },
      {
        label: 'Roles & permissions',
        href: '/dashboard/admin/roles',
        icon: KeyRound,
      },
    ],
  },
  {
    label: 'Payments & operations',
    items: [
      {
        label: 'M-Pesa reconciliation',
        href: '/dashboard/admin/mpesa',
        icon: Landmark,
      },
      {
        label: 'Registers & shifts',
        href: '/dashboard/admin/operations',
        icon: CreditCard,
      },
    ],
  },
  {
    label: 'System & security',
    items: [
      {
        label: 'Integrations',
        href: '/dashboard/admin/integrations',
        icon: Activity,
      },
      {
        label: 'Security',
        href: '/dashboard/admin/security',
        icon: ShieldCheck,
      },
      {
        label: 'Audit activity',
        href: '/dashboard/admin/audit',
        icon: FileClock,
      },
    ],
  },
] as const;

function AdminLink({
  item,
  pathname,
  compact = false,
}: {
  item: AdminNavItem;
  pathname: string;
  compact?: boolean;
}) {
  const active =
    'exact' in item && item.exact
      ? pathname === item.href
      : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 border-l-2 text-sm transition-colors',
        compact ? 'shrink-0 rounded-lg border px-3 py-2' : 'px-4 py-2.5',
        active
          ? 'border-primary bg-primary/10 font-semibold text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          active
            ? 'text-primary'
            : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  );
}

export function AdminControlShell({
  organizationName,
  children,
}: {
  organizationName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = sections.flatMap((section) => section.items);

  return (
    <div className="-mx-4 -my-4 min-h-[calc(100vh-4rem)] bg-[var(--dashboard-canvas)] sm:-mx-6 sm:-my-5 lg:-mx-7 lg:-my-5">
      <div className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] lg:block">
          <div className="sticky top-0 max-h-[calc(100vh-4rem)] overflow-y-auto py-3">
            <div className="border-b border-[var(--dashboard-border)] px-4 pb-3 pt-1">
              <p className="text-xs font-semibold text-foreground">
                Admin settings
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {organizationName}
              </p>
            </div>
            <nav className="py-2" aria-label="Admin control navigation">
              {items.map((item) => (
                <AdminLink key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="border-b border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-3 lg:hidden">
            <div className="mb-3 flex items-center gap-2 px-1">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-bold">Admin control</span>
              <span className="truncate text-xs text-muted-foreground">
                · {organizationName}
              </span>
            </div>
            <nav
              className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Admin control navigation"
            >
              {items.map((item) => (
                <AdminLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  compact
                />
              ))}
            </nav>
          </div>
          <div className="mx-auto w-full max-w-[1280px] p-4 sm:p-6 xl:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
