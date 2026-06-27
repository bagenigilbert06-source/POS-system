'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'POS Terminal', href: '/dashboard/pos', icon: ShoppingCart },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Inventory', href: '/dashboard/inventory', icon: Boxes },
  { label: 'Sales', href: '/dashboard/sales', icon: Receipt },
  { label: 'Customers', href: '/dashboard/customers', icon: Users },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
]

const bottomItems = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <aside
      className={cn(
        'flex flex-col bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))]',
        'transition-all duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-[hsl(var(--sidebar-border))] px-4 gap-3',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 flex-shrink-0 shadow-sm">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">BizOS Kenya</p>
              <p className="text-xs text-[hsl(var(--sidebar-fg))]">Business OS</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'rounded-lg p-1.5 text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-white transition-colors',
            collapsed && 'hidden'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 rounded p-1 text-[hsl(var(--sidebar-fg))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-white transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        {!collapsed && (
          <p className="section-label mb-3 px-3 text-[hsl(var(--sidebar-fg))]">Navigation</p>
        )}
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item',
                    collapsed ? 'justify-center px-0 py-3' : '',
                    active ? 'sidebar-item-active' : 'sidebar-item-inactive'
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-[hsl(var(--sidebar-border))] py-3 px-2">
        <ul className="space-y-0.5">
          {bottomItems.map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item',
                    collapsed ? 'justify-center px-0 py-2.5' : '',
                    active ? 'sidebar-item-active' : 'sidebar-item-inactive'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
