'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/context/workspace-context';
import {
  AlertTriangle,
  Apple,
  Baby,
  BarChart3,
  Barcode,
  BellRing,
  BedDouble,
  Beer,
  Bone,
  BookOpen,
  Boxes,
  Brush,
  Cable,
  Cake,
  Calendar,
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  Coffee,
  Cookie,
  CreditCard,
  Droplets,
  Drumstick,
  FileBarChart,
  FileText,
  Flower,
  Footprints,
  GlassWater,
  Grid,
  HandCoins,
  Heart,
  Home,
  Laptop,
  LayoutDashboard,
  Leaf,
  Martini,
  Milk,
  Monitor,
  Package,
  Package2,
  PackagePlus,
  PackageSearch,
  PaintBucket,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  Plug,
  ReceiptText,
  Salad,
  Scale,
  Sandwich,
  Scissors,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Shuffle,
  Smartphone,
  Sofa,
  Sparkles,
  Star,
  Stethoscope,
  Tags,
  TreePine,
  TrendingUp,
  Tv,
  Users,
  UsersRound,
  UtensilsCrossed,
  Wallet,
  WalletCards,
  Watch,
  Wheat,
  Wind,
  Wine,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { PesabyLogoMark } from '@/components/brand/pesaby-logo';
import { PermissionEnum } from '@/lib/types/permissions';
import { isPharmacyBusiness } from '@/lib/pharmacy/rules';

const ICONS: Record<string, LucideIcon> = {
  AlertTriangle,
  Apple,
  Baby,
  BarChart3,
  Barcode,
  BellRing,
  BedDouble,
  Beer,
  Bone,
  BookOpen,
  Bottle: Wine,
  Boxes,
  Brush,
  Cable,
  Cake,
  Calendar,
  ChartNoAxesCombined: BarChart3,
  ChefHat,
  ClipboardCheck,
  ClipboardList,
  Coffee,
  Cookie,
  CreditCard,
  Droplets,
  Drumstick,
  FileBarChart,
  FileText,
  Flower,
  Footprints,
  GlassWater,
  Grid,
  HandCoins,
  Heart,
  Home,
  Laptop,
  LayoutDashboard,
  Leaf,
  Martini,
  Milk,
  Monitor,
  Package,
  Package2,
  PackagePlus,
  PackageSearch,
  PaintBucket,
  Palette,
  Pill,
  Plug,
  ReceiptText,
  Salad,
  Scale,
  Sandwich,
  Scissors,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Shuffle,
  Smartphone,
  Sofa,
  Sparkles,
  Star,
  Stethoscope,
  Tags,
  TreePine,
  TrendingUp,
  Tv,
  Users,
  UsersRound,
  UtensilsCrossed,
  Wallet,
  WalletCards,
  Watch,
  Wheat,
  Wind,
  Wine,
  Wrench,
  Zap,
};

function getIcon(iconName: string): LucideIcon {
  return ICONS[iconName] ?? LayoutDashboard;
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
    prescriptions: PermissionEnum.PRESCRIPTION_VIEW,
    products: PermissionEnum.PRODUCT_VIEW,
    categories: PermissionEnum.PRODUCT_EDIT,
    barcodes: PermissionEnum.PRODUCT_VIEW,
    attendance: PermissionEnum.ATTENDANCE_USE,
    inventory: PermissionEnum.INVENTORY_VIEW,
    batches: PermissionEnum.BATCH_TRACKING_VIEW,
    customers: PermissionEnum.CUSTOMER_VIEW,
    analytics: PermissionEnum.REPORT_VIEW,
    reports: PermissionEnum.REPORT_VIEW,
    purchases: PermissionEnum.INVENTORY_RECEIVE,
    expenses: PermissionEnum.EXPENSE_VIEW,
    operations: PermissionEnum.SHIFT_MANAGE,
    settings: PermissionEnum.SETTINGS_VIEW,
    staff: PermissionEnum.STAFF_MANAGE,
    'staff-performance': PermissionEnum.STAFF_VIEW,
    admin: PermissionEnum.ADMIN_ACCESS,
    etims: PermissionEnum.ETIMS_VIEW,
    coupons: PermissionEnum.REWARDS_VIEW,
    discounts: PermissionEnum.REWARDS_VIEW,
    bonuses: PermissionEnum.REWARDS_VIEW,
    financials: PermissionEnum.FINANCE_VIEW,
    invoices: PermissionEnum.INVOICE_VIEW,
    receivables: PermissionEnum.RECEIVABLE_VIEW,
    'financial-accounts': PermissionEnum.FINANCE_VIEW,
    reconciliation: PermissionEnum.FINANCE_VIEW,
    'finance-audit': PermissionEnum.AUDIT_LOG_VIEW,
  };
  // Unknown workspace items are hidden until they have an explicit permission mapping.
  const canView = (id: string) =>
    Boolean(
      permissionForNavItem[id] && permissions.includes(permissionForNavItem[id])
    );
  const workspaceLabel = (id: string, fallback: string) =>
    config.sidebarConfig.primaryNav.find((item) => item.id === id)?.label ??
    fallback;
  const posNav = {
    id: 'pos',
    label: workspaceLabel('pos', 'Point of sale'),
    icon: 'ReceiptText',
    route: '/dashboard/pos',
  };
  const staffNav = {
    id: 'staff',
    label: 'Staff & access',
    icon: 'UsersRound',
    route: '/dashboard/staff',
  };
  const staffPerformanceNav = {
    id: 'staff-performance',
    label: 'Staff performance',
    icon: 'TrendingUp',
    route: '/dashboard/staff-performance',
  };
  const myReceiptsNav = {
    id: 'my-sales',
    label: 'My receipts',
    icon: 'ReceiptText',
    route: '/dashboard/pos/history',
  };
  const adminNav = {
    id: 'admin',
    label: 'Admin control',
    icon: 'ShieldCheck',
    route: '/dashboard/admin',
  };
  const etimsNav = {
    id: 'etims',
    label: 'eTIMS',
    icon: 'ReceiptText',
    route: '/dashboard/etims',
  };
  const promotionNav = [
    {
      id: 'coupons',
      label: 'Coupons',
      icon: 'Tags',
      route: '/dashboard/promotions/coupons',
    },
    {
      id: 'discounts',
      label: 'Discounts',
      icon: 'ReceiptText',
      route: '/dashboard/promotions/discounts',
    },
    {
      id: 'bonuses',
      label: 'Bonuses',
      icon: 'Sparkles',
      route: '/dashboard/promotions/bonuses',
    },
  ];
  const financeNav = [
    { id: 'financials', label: 'Financial Overview', icon: 'WalletCards', route: '/dashboard/financials' },
    { id: 'expenses', label: 'Expenses', icon: 'ReceiptText', route: '/dashboard/expenses' },
    { id: 'invoices', label: 'Invoices', icon: 'FileText', route: '/dashboard/invoices' },
    { id: 'receivables', label: 'Accounts Receivable', icon: 'HandCoins', route: '/dashboard/receivables' },
    { id: 'financial-accounts', label: 'Payment Accounts', icon: 'Wallet', route: '/dashboard/finance/accounts' },
    { id: 'reconciliation', label: 'Reconciliation', icon: 'Shuffle', route: '/dashboard/finance/reconciliation' },
    { id: 'finance-audit', label: 'Finance Audit', icon: 'ShieldCheck', route: '/dashboard/finance/audit' },
  ];
  // Keep the navigation aligned with the way a shop is run: understand the
  // business first, sell second, then manage the catalogue and operations.
  // The workspace template still decides which entries exist; this only gives
  // the common entries a consistent, easy-to-scan order.
  const dashboardNav = config.sidebarConfig.primaryNav.filter(
    (item) => item.id === 'dashboard'
  );
  const workspaceNav = config.sidebarConfig.primaryNav.filter(
    (item) =>
      item.id !== 'dashboard' &&
      item.id !== 'pos' &&
      item.id !== 'admin' &&
      ![
        'expenses',
        'financials',
        'invoices',
        'receivables',
        'financial-accounts',
        'reconciliation',
        'finance-audit',
      ].includes(item.id)
  );
  const composedPrimaryNav = [
    ...dashboardNav,
    ...(permissions.includes(PermissionEnum.POS_VIEW) ||
    permissions.includes(PermissionEnum.POS_SELL)
      ? [posNav]
      : []),
    ...(permissions.includes(PermissionEnum.SALES_VIEW_OWN) &&
    !permissions.includes(PermissionEnum.SALES_VIEW_ALL)
      ? [myReceiptsNav]
      : []),
    ...workspaceNav,
    ...(permissions.includes(PermissionEnum.REWARDS_VIEW) ? promotionNav : []),
    ...(permissions.includes(PermissionEnum.ETIMS_VIEW) ? [etimsNav] : []),
    ...financeNav.filter((item) => canView(item.id)),
    ...(permissions.includes(PermissionEnum.STAFF_MANAGE) ? [staffNav] : []),
    ...(permissions.includes(PermissionEnum.STAFF_VIEW)
      ? [staffPerformanceNav]
      : []),
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
    ...(permissions.includes(PermissionEnum.ATTENDANCE_USE)
      ? [
          {
            id: 'attendance',
            label: 'Attendance',
            icon: 'Watch',
            route: '/dashboard/attendance',
          },
        ]
      : []),
    ...(canView('pos') ? [posNav] : []),
    ...(permissions.includes(PermissionEnum.SALES_VIEW_OWN)
      ? [myReceiptsNav]
      : []),
    ...(config.enabledModules.includes('customers') &&
    permissions.includes(PermissionEnum.CUSTOMER_VIEW)
      ? [
          {
            id: 'customers',
            label: workspaceLabel('customers', 'Customers'),
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
    ...(permissions.includes(PermissionEnum.ATTENDANCE_USE)
      ? [
          {
            id: 'attendance',
            label: 'Attendance',
            icon: 'Watch',
            route: '/dashboard/attendance',
          },
        ]
      : []),
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
            label: workspaceLabel('sales', 'Sales'),
            icon: 'ReceiptText',
            route: '/dashboard/sales',
          },
        ]
      : []),
    ...(permissions.includes(PermissionEnum.INVENTORY_VIEW)
      ? [
          {
            id: 'inventory',
            label: workspaceLabel('inventory', 'Inventory'),
            icon: 'Boxes',
            route: '/dashboard/inventory',
          },
        ]
      : []),
    ...(isPharmacyBusiness(config.businessType, config.businessCategory) &&
    permissions.includes(PermissionEnum.PRESCRIPTION_VIEW)
      ? [
          {
            id: 'prescriptions',
            label: 'Prescription records',
            icon: 'FileText',
            route: '/dashboard/pharmacy/prescriptions',
          },
        ]
      : []),
    ...(isPharmacyBusiness(config.businessType, config.businessCategory) &&
    permissions.includes(PermissionEnum.BATCH_TRACKING_VIEW)
      ? [
          {
            id: 'batches',
            label: 'Batches & expiry',
            icon: 'Calendar',
            route: '/dashboard/inventory/batches',
          },
        ]
      : []),
    ...(isPharmacyBusiness(config.businessType, config.businessCategory) &&
    permissions.includes(PermissionEnum.BATCH_TRACKING_VIEW)
      ? [
          {
            id: 'pharmacy-alerts',
            label: 'Pharmacy alerts',
            icon: 'BellRing',
            route: '/dashboard/pharmacy/alerts',
          },
          {
            id: 'medicine-recalls',
            label: 'Medicine recalls',
            icon: 'AlertTriangle',
            route: '/dashboard/pharmacy/recalls',
          },
          {
            id: 'pharmacy-reconciliation',
            label: 'Batch reconciliation',
            icon: 'Scale',
            route: '/dashboard/pharmacy/reconciliation',
          },
        ]
      : []),
  ];
  const secondaryNav = config.sidebarConfig.secondaryNav.filter(
    (item) =>
      canView(item.id) &&
      !(
        item.id === 'settings' &&
        permissions.includes(PermissionEnum.ADMIN_ACCESS)
      )
  );
  const visiblePrimaryNav =
    role === 'cashier'
      ? cashierPrimaryNav
      : role === 'supervisor'
        ? supervisorPrimaryNav
        : primaryNav;
  const visibleSecondaryNav =
    role === 'cashier' || role === 'supervisor' ? [] : secondaryNav;
  const navigationGroups = [
    { label: 'Workspace', ids: ['dashboard', 'pos', 'my-sales'] },
    {
      label: 'Sales & catalogue',
      ids: ['sales', 'products', 'categories', 'customers', 'prescriptions'],
    },
    {
      label: 'Inventory & operations',
      ids: ['inventory', 'batches', 'purchases', 'operations'],
    },
    {
      label: 'Staff & access',
      ids: ['attendance', 'staff', 'staff-performance'],
    },
    {
      label: 'Finance',
      ids: [
        'financials',
        'expenses',
        'invoices',
        'receivables',
        'financial-accounts',
        'reconciliation',
        'finance-audit',
      ],
    },
    {
      label: 'Promotions & rewards',
      ids: ['coupons', 'discounts', 'bonuses'],
    },
    {
      label: 'Tax & compliance',
      ids: ['etims'],
    },
    {
      label: 'Insights & reports',
      ids: [
        'reports',
        'analytics',
        'sales-analytics',
        'customer-analytics',
        'inventory-analytics',
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: visiblePrimaryNav.filter((item) => group.ids.includes(item.id)),
    }))
    .filter((group) => group.items.length > 0);
  const ungroupedNav = visiblePrimaryNav.filter(
    (item) =>
      !navigationGroups.some((group) =>
        group.items.some((groupItem) => groupItem.id === item.id)
      )
  );
  const sidebarWidth = sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-[248px]';

  const sidebar = (
    <aside
      className={cn(
        'dashboard-sidebar flex h-full flex-col border-r',
        'transition-all duration-200 ease-in-out',
        'w-[248px] max-w-[85vw]',
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
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {[
          ...navigationGroups,
          ...(ungroupedNav.length
            ? [{ label: 'More', ids: [], items: ungroupedNav }]
            : []),
        ].map((group) => (
          <section key={group.label} className="mb-5 last:mb-0">
            {!sidebarCollapsed && (
              <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--dashboard-muted)]">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                // Skip items that don't have a route
                if (!item.route) return null;

                const active = isActive(item.route);
                const IconComponent = getIcon(item.icon);

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
                        'sidebar-item rounded-md transition-colors',
                        sidebarCollapsed
                          ? 'lg:justify-center lg:px-3 lg:py-2'
                          : 'px-3 py-2',
                        active
                          ? 'border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]'
                          : 'text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-subtle)] hover:text-[var(--dashboard-text)]'
                      )}
                    >
                      <IconComponent
                        className="h-4 w-4 flex-shrink-0"
                        strokeWidth={1.8}
                      />
                      <span
                        className={cn(
                          'text-sm font-medium leading-5',
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
          </section>
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-[var(--dashboard-border)] px-3 py-3">
        <ul className="space-y-1">
          {visibleSecondaryNav.map((item) => {
            const IconComponent = getIcon(item.icon);
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
                    'sidebar-item rounded-md transition-colors',
                    sidebarCollapsed
                      ? 'lg:justify-center lg:px-3 lg:py-2'
                      : 'px-3 py-2',
                    active
                      ? 'border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]'
                      : 'text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-subtle)] hover:text-[var(--dashboard-text)]'
                  )}
                >
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  <span
                    className={cn(
                      'text-sm font-medium leading-5',
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
      <div className="hidden h-full lg:block">{sidebar}</div>
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
