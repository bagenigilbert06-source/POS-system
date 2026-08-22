'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/context/workspace-context';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { PesabyLogoMark } from '@/components/brand/pesaby-logo';
import { PermissionEnum } from '@/lib/types/permissions';

type IconName = keyof typeof Icons;

function getIcon(iconName: string): React.ElementType {
  const icon = Icons[iconName as IconName];
  return (
    (icon as React.ElementType) || (Icons.LayoutDashboard as React.ElementType)
  );
}

interface DynamicAppSidebarProps {
  initialPermissions: readonly PermissionEnum[];
  initialRole?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function DynamicAppSidebar({
  initialPermissions: permissions,
  initialRole: role,
  mobileOpen = false,
  onMobileClose,
}: DynamicAppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const { config } = useWorkspace();
  const adminMode =
    pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/');
  const sidebarCollapsed = adminMode ? !adminExpanded : collapsed;

  useEffect(() => {
    setCollapsed(
      window.localStorage.getItem('pesaby-sidebar-collapsed') === 'true'
    );
  }, []);

  useEffect(() => {
    if (adminMode) setAdminExpanded(false);
  }, [adminMode]);

  // The register is the highest-frequency destination. Warm its RSC request as
  // soon as the authenticated dashboard shell becomes interactive.
  useEffect(() => {
    if (pathname !== '/dashboard/pos') router.prefetch('/dashboard/pos');
  }, [pathname, router]);

  const setSidebarCollapsed = (value: boolean) => {
    setCollapsed(value);
    window.localStorage.setItem('pesaby-sidebar-collapsed', String(value));
  };

  const setVisibleSidebarCollapsed = (value: boolean) => {
    if (adminMode) {
      setAdminExpanded(!value);
      return;
    }
    setSidebarCollapsed(value);
  };

  if (!config) {
    return (
      <aside className="dashboard-sidebar hidden w-64 flex-col border-r lg:flex">
        <div className="flex h-16 items-center border-b border-[hsl(var(--sidebar-border))] px-4">
          <PesabyLogoMark className="h-8 w-8" />
        </div>
      </aside>
    );
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/dashboard/products/categories') return pathname === href;
    if (
      href === '/dashboard/products' &&
      pathname.startsWith('/dashboard/products/categories')
    )
      return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const permissionForNavItem: Record<string, PermissionEnum> = {
    pos: PermissionEnum.POS_VIEW,
    'my-sales': PermissionEnum.SALES_VIEW_OWN,
    dashboard: PermissionEnum.SALES_VIEW_ALL,
    sales: PermissionEnum.SALES_VIEW_ALL,
    products: PermissionEnum.PRODUCT_VIEW,
    categories: PermissionEnum.PRODUCT_EDIT,
    inventory: PermissionEnum.INVENTORY_VIEW,
    customers: PermissionEnum.CUSTOMER_VIEW,
    analytics: PermissionEnum.REPORT_VIEW,
    reports: PermissionEnum.REPORT_VIEW,
    purchases: PermissionEnum.PURCHASE_VIEW,
    expenses: PermissionEnum.EXPENSE_VIEW,
    operations: PermissionEnum.SHIFT_MANAGE,
    settings: PermissionEnum.SETTINGS_VIEW,
    staff: PermissionEnum.STAFF_MANAGE,
    admin: PermissionEnum.ADMIN_ACCESS,
  };
  // Unknown workspace items are hidden until they have an explicit permission mapping.
  const canView = (id: string) =>
    Boolean(
      permissionForNavItem[id] && permissions.includes(permissionForNavItem[id])
    );
  const posNav = {
    id: 'pos',
    label: 'Point of sale',
    icon: 'ReceiptText',
    route: '/dashboard/pos',
  };
  const staffNav = {
    id: 'staff',
    label: 'Staff & access',
    icon: 'UsersRound',
    route: '/dashboard/staff',
  };
  const adminNav = {
    id: 'admin',
    label: 'Admin control',
    icon: 'ShieldCheck',
    route: '/dashboard/admin',
  };
  // Keep the navigation aligned with the way a shop is run: understand the
  // business first, sell second, then manage the catalogue and operations.
  // The workspace template still decides which entries exist; this only gives
  // the common entries a consistent, easy-to-scan order.
  const dashboardNav = config.sidebarConfig.primaryNav.filter(
    (item) => item.id === 'dashboard'
  );
  const workspaceNav = config.sidebarConfig.primaryNav.filter(
    (item) =>
      item.id !== 'dashboard' && item.id !== 'pos' && item.id !== 'admin'
  );
  const composedPrimaryNav = [
    ...dashboardNav,
    ...(permissions.includes(PermissionEnum.POS_VIEW) ||
    permissions.includes(PermissionEnum.POS_SELL)
      ? [posNav]
      : []),
    ...workspaceNav,
    ...(permissions.includes(PermissionEnum.STAFF_MANAGE) ? [staffNav] : []),
    ...(permissions.includes(PermissionEnum.ADMIN_ACCESS) ? [adminNav] : []),
  ];
  const primaryNav = composedPrimaryNav.filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.id === item.id) === index &&
      canView(item.id) &&
      !(
        ['cashier', 'supervisor', 'inventory', 'accountant'].includes(
          role ?? ''
        ) && item.id === 'dashboard'
      )
  );
  // Keep the cashier workspace focused on counter work and their own records.
  // Management, inventory and business-wide reporting remain unavailable here.
  const cashierPrimaryNav = [
    ...(canView('pos') ? [posNav] : []),
    ...(permissions.includes(PermissionEnum.SALES_VIEW_OWN)
      ? [
          {
            id: 'my-sales',
            label: 'My receipts',
            icon: 'ReceiptText',
            route: '/dashboard/pos/history',
          },
        ]
      : []),
    ...(config.enabledModules.includes('customers') &&
    permissions.includes(PermissionEnum.CUSTOMER_VIEW)
      ? [
          {
            id: 'customers',
            label: 'Customers',
            icon: 'Users',
            route: '/dashboard/customers',
          },
        ]
      : []),
  ];
  // A supervisor's workspace is deliberately operational: approve and review
  // register activity, sell when needed, and check stock.
  // Configuration, staff administration and financial settings stay hidden.
  const supervisorPrimaryNav = [
    ...(permissions.includes(PermissionEnum.SHIFT_MANAGE)
      ? [
          {
            id: 'operations',
            label: 'Operations',
            icon: 'ClipboardCheck',
            route: '/dashboard/operations',
          },
        ]
      : []),
    ...(canView('pos') ? [posNav] : []),
    ...(permissions.includes(PermissionEnum.SALES_VIEW_ALL)
      ? [
          {
            id: 'sales',
            label: 'Sales',
            icon: 'ReceiptText',
            route: '/dashboard/sales',
          },
        ]
      : []),
    ...(permissions.includes(PermissionEnum.INVENTORY_VIEW)
      ? [
          {
            id: 'inventory',
            label: 'Inventory',
            icon: 'Boxes',
            route: '/dashboard/inventory',
          },
        ]
      : []),
  ];
  const secondaryNav = config.sidebarConfig.secondaryNav.filter((item) =>
    canView(item.id)
  );
  const visiblePrimaryNav =
    role === 'cashier'
      ? cashierPrimaryNav
      : role === 'supervisor'
        ? supervisorPrimaryNav
        : primaryNav;
  const visibleSecondaryNav =
    role === 'cashier' || role === 'supervisor' ? [] : secondaryNav;
  const sidebarWidth = sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-[223px]';

  const sidebar = (
    <aside
      className={cn(
        'dashboard-sidebar flex h-full flex-col border-r',
        'transition-all duration-200 ease-in-out',
        'w-[223px] max-w-[85vw]',
        sidebarWidth
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center gap-3 border-b border-[var(--dashboard-border)] px-4',
          sidebarCollapsed ? 'justify-center' : 'justify-start'
        )}
      >
        <PesabyLogoMark className="h-8 w-8 flex-shrink-0 lg:hidden" />
        <button
          onClick={() => setVisibleSidebarCollapsed(!sidebarCollapsed)}
          className="group relative hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-transparent text-[var(--dashboard-muted)] transition-colors hover:border-[var(--dashboard-border)] hover:bg-[var(--dashboard-surface-subtle)] hover:text-[var(--dashboard-text)] focus-visible:border-[var(--dashboard-accent-soft-border)] focus-visible:bg-[var(--dashboard-accent-soft)] focus-visible:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] lg:inline-flex"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PesabyLogoMark className="h-8 w-8 transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0" />
          {sidebarCollapsed ? (
            <PanelLeftOpen className="absolute h-[19px] w-[19px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
          ) : (
            <PanelLeftClose className="absolute h-[19px] w-[19px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
          )}
          <span
            role="tooltip"
            className={cn(
              'pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-chart-tooltip)] px-2.5 py-1.5 text-xs font-medium text-[var(--dashboard-text)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block',
              sidebarCollapsed
                ? 'left-[calc(100%+10px)] top-1/2 -translate-y-1/2'
                : 'left-0 top-[calc(100%+8px)]'
            )}
          >
            {sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
          </span>
        </button>
        {!sidebarCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight text-[var(--dashboard-text)]">
              Pesaby
            </p>
            <p className="max-w-36 truncate text-xs text-[var(--dashboard-muted)]">
              {config.name}
            </p>
          </div>
        )}
        <button
          onClick={onMobileClose}
          className="ml-auto rounded-lg p-1.5 text-[var(--dashboard-muted)] transition-colors hover:bg-[var(--dashboard-surface-subtle)] hover:text-[var(--dashboard-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        {!sidebarCollapsed && (
          <p className="section-label mb-4 px-3 text-[#a1a1a6] text-xs font-semibold uppercase tracking-wider">
            Workspace
          </p>
        )}
        <ul className="space-y-1.5">
          {visiblePrimaryNav.map((item) => {
            // Skip items that don't have a route
            if (!item.route) return null;

            const active = isActive(item.route);
            const IconComponent = getIcon(item.icon) as React.ElementType;

            return (
              <li key={item.id}>
                <Link
                  href={item.route}
                  prefetch
                  onMouseEnter={() => router.prefetch(item.route!)}
                  onFocus={() => router.prefetch(item.route!)}
                  onClick={onMobileClose}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item rounded-lg transition-all',
                    sidebarCollapsed
                      ? 'lg:justify-center lg:px-3 lg:py-2.5'
                      : 'px-3 py-2.5',
                    active
                      ? 'bg-[rgba(255,214,10,0.1)] text-[#ffd60a] border border-[rgba(255,214,10,0.2)]'
                      : 'text-[#a1a1a6] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f5f5f7]'
                  )}
                >
                  <IconComponent className="h-5 w-5 flex-shrink-0" />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      sidebarCollapsed && 'lg:hidden'
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-[rgba(255,214,10,0.08)] py-4 px-3">
        <ul className="space-y-1">
          {visibleSecondaryNav.map((item) => {
            const IconComponent = getIcon(item.icon) as React.ElementType;
            const active = item.route ? isActive(item.route) : false;

            return (
              <li key={item.id}>
                <Link
                  href={item.route || '/dashboard/settings'}
                  prefetch
                  onMouseEnter={() =>
                    router.prefetch(item.route || '/dashboard/settings')
                  }
                  onFocus={() =>
                    router.prefetch(item.route || '/dashboard/settings')
                  }
                  onClick={onMobileClose}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item rounded-lg transition-all',
                    sidebarCollapsed
                      ? 'lg:justify-center lg:px-3 lg:py-2.5'
                      : 'px-3 py-2.5',
                    active
                      ? 'bg-[rgba(255,214,10,0.1)] text-[#ffd60a] border border-[rgba(255,214,10,0.2)]'
                      : 'text-[#a1a1a6] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f5f5f7]'
                  )}
                >
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      sidebarCollapsed && 'lg:hidden'
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 h-full w-full bg-black/35"
            onClick={onMobileClose}
            aria-label="Close navigation overlay"
          />
          <div className="relative h-full">{sidebar}</div>
        </div>
      )}
    </>
  );
}
