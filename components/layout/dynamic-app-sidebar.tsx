'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'
import { useEffect, useState } from 'react'
import { useWorkspace } from '@/lib/context/workspace-context'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'
import { PermissionEnum } from '@/lib/types/permissions'

type IconName = keyof typeof Icons

function getIcon(iconName: string): React.ElementType {
  const icon = Icons[iconName as IconName]
  return (icon as React.ElementType) || (Icons.LayoutDashboard as React.ElementType)
}

interface DynamicAppSidebarProps {
  initialPermissions: readonly PermissionEnum[]
  initialRole?: string
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function DynamicAppSidebar({ initialPermissions: permissions, initialRole: role, mobileOpen = false, onMobileClose }: DynamicAppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const { config } = useWorkspace()

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('pesaby-sidebar-collapsed') === 'true')
  }, [])

  // The register is the highest-frequency destination. Warm its RSC request as
  // soon as the authenticated dashboard shell becomes interactive.
  useEffect(() => {
    if (pathname !== '/dashboard/pos') router.prefetch('/dashboard/pos')
  }, [pathname, router])

  const setSidebarCollapsed = (value: boolean) => {
    setCollapsed(value)
    window.localStorage.setItem('pesaby-sidebar-collapsed', String(value))
  }

  if (!config) {
    return (
      <aside className="dashboard-sidebar hidden w-64 flex-col border-r lg:flex">
        <div className="flex h-16 items-center border-b border-[hsl(var(--sidebar-border))] px-4">
          <PesabyLogoMark className="h-8 w-8" />
        </div>
      </aside>
    )
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/dashboard/products/categories') return pathname === href
    if (href === '/dashboard/products' && pathname.startsWith('/dashboard/products/categories')) return false
    return pathname === href || pathname.startsWith(`${href}/`)
  }

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
  }
  // Unknown workspace items are hidden until they have an explicit permission mapping.
  const canView = (id: string) => Boolean(permissionForNavItem[id] && permissions.includes(permissionForNavItem[id]))
  const posNav = { id: 'pos', label: 'Point of sale', icon: 'ReceiptText', route: '/dashboard/pos' }
  const staffNav = { id: 'staff', label: 'Staff & access', icon: 'UsersRound', route: '/dashboard/staff' }
  // Keep the navigation aligned with the way a shop is run: understand the
  // business first, sell second, then manage the catalogue and operations.
  // The workspace template still decides which entries exist; this only gives
  // the common entries a consistent, easy-to-scan order.
  const dashboardNav = config.sidebarConfig.primaryNav.filter((item) => item.id === 'dashboard')
  const workspaceNav = config.sidebarConfig.primaryNav.filter((item) => item.id !== 'dashboard' && item.id !== 'pos')
  const composedPrimaryNav = [
    ...dashboardNav,
    ...(permissions.includes(PermissionEnum.POS_VIEW) || permissions.includes(PermissionEnum.POS_SELL) ? [posNav] : []),
    ...workspaceNav,
    ...(permissions.includes(PermissionEnum.STAFF_MANAGE) ? [staffNav] : []),
  ]
  const primaryNav = composedPrimaryNav.filter((item, index, items) =>
    items.findIndex((candidate) => candidate.id === item.id) === index &&
    canView(item.id) &&
    !(['cashier', 'supervisor', 'inventory', 'accountant'].includes(role ?? '') && item.id === 'dashboard')
  )
  // Keep the cashier workspace focused on counter work and their own records.
  // Management, inventory and business-wide reporting remain unavailable here.
  const cashierPrimaryNav = [
    ...(canView('pos') ? [posNav] : []),
    ...(permissions.includes(PermissionEnum.SALES_VIEW_OWN) ? [{ id: 'my-sales', label: 'My receipts', icon: 'ReceiptText', route: '/dashboard/pos/history' }] : []),
    ...(config.enabledModules.includes('customers') && permissions.includes(PermissionEnum.CUSTOMER_VIEW) ? [{ id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' }] : []),
  ]
  // A supervisor's workspace is deliberately operational: approve and review
  // register activity, sell when needed, check stock, and assist customers.
  // Configuration, staff administration and financial settings stay hidden.
  const supervisorPrimaryNav = [
    ...(permissions.includes(PermissionEnum.SHIFT_MANAGE) ? [{ id: 'operations', label: 'Operations', icon: 'ClipboardCheck', route: '/dashboard/operations' }] : []),
    ...(canView('pos') ? [posNav] : []),
    ...(permissions.includes(PermissionEnum.SALES_VIEW_ALL) ? [{ id: 'sales', label: 'Sales', icon: 'ReceiptText', route: '/dashboard/sales' }] : []),
    ...(permissions.includes(PermissionEnum.INVENTORY_VIEW) ? [{ id: 'inventory', label: 'Inventory', icon: 'Boxes', route: '/dashboard/inventory' }] : []),
    ...(permissions.includes(PermissionEnum.PRODUCT_VIEW) ? [{ id: 'products', label: 'Products', icon: 'Package', route: '/dashboard/products' }] : []),
    ...(config.enabledModules.includes('customers') && permissions.includes(PermissionEnum.CUSTOMER_VIEW) ? [{ id: 'customers', label: 'Customers', icon: 'Users', route: '/dashboard/customers' }] : []),
  ]
  const secondaryNav = config.sidebarConfig.secondaryNav.filter((item) => canView(item.id))
  const visiblePrimaryNav = role === 'cashier' ? cashierPrimaryNav : role === 'supervisor' ? supervisorPrimaryNav : primaryNav
  const visibleSecondaryNav = role === 'cashier' || role === 'supervisor' ? [] : secondaryNav
  const sidebarWidth = collapsed ? 'lg:w-[68px]' : 'lg:w-[223px]'

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
          'flex h-16 items-center border-b border-[rgba(255,214,10,0.08)] px-4 gap-3',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1">
            <PesabyLogoMark className="h-8 w-8 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold leading-tight text-[#f5f5f7]">Pesaby</p>
              <p className="max-w-36 truncate text-xs text-[#a1a1a6]">{config.name}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <PesabyLogoMark className="h-8 w-8" />
        )}
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className={cn(
            'hidden rounded-lg p-1.5 text-[#a1a1a6] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f5f5f7] transition-all lg:inline-flex',
            collapsed && 'lg:hidden'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onMobileClose}
          className="rounded-lg p-1.5 text-[#a1a1a6] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f5f5f7] lg:hidden transition-all"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="mx-auto mt-4 hidden rounded-lg p-1.5 text-[#a1a1a6] hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f5f5f7] transition-all lg:inline-flex"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        {!collapsed && (
          <p className="section-label mb-4 px-3 text-[#a1a1a6] text-xs font-semibold uppercase tracking-wider">Workspace</p>
        )}
        <ul className="space-y-1.5">
          {visiblePrimaryNav.map((item) => {
            // Skip items that don't have a route
            if (!item.route) return null
            
            const active = isActive(item.route)
            const IconComponent = getIcon(item.icon) as React.ElementType

            return (
              <li key={item.id}>
                <Link
                  href={item.route}
                  prefetch
                  onMouseEnter={() => router.prefetch(item.route!)}
                  onFocus={() => router.prefetch(item.route!)}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item rounded-lg transition-all',
                    collapsed ? 'lg:justify-center lg:px-3 lg:py-2.5' : 'px-3 py-2.5',
                    active 
                      ? 'bg-[rgba(255,214,10,0.1)] text-[#ffd60a] border border-[rgba(255,214,10,0.2)]' 
                      : 'text-[#a1a1a6] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f5f5f7]'
                  )}
                >
                  <IconComponent className="h-5 w-5 flex-shrink-0" />
                  <span className={cn('text-sm font-medium', collapsed && 'lg:hidden')}>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-[rgba(255,214,10,0.08)] py-4 px-3">
        <ul className="space-y-1">
          {visibleSecondaryNav.map((item) => {
            const IconComponent = getIcon(item.icon) as React.ElementType
            const active = item.route ? isActive(item.route) : false

            return (
              <li key={item.id}>
                <Link
                  href={item.route || '/dashboard/settings'}
                  prefetch
                  onMouseEnter={() => router.prefetch(item.route || '/dashboard/settings')}
                  onFocus={() => router.prefetch(item.route || '/dashboard/settings')}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item rounded-lg transition-all',
                    collapsed ? 'lg:justify-center lg:px-3 lg:py-2.5' : 'px-3 py-2.5',
                    active 
                      ? 'bg-[rgba(255,214,10,0.1)] text-[#ffd60a] border border-[rgba(255,214,10,0.2)]' 
                      : 'text-[#a1a1a6] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f5f5f7]'
                  )}
                >
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('text-sm font-medium', collapsed && 'lg:hidden')}>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )

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
  )
}
