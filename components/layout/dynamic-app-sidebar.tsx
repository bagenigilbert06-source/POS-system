'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'
import { useEffect, useState } from 'react'
import { useWorkspace } from '@/lib/context/workspace-context'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'

type IconName = keyof typeof Icons

function getIcon(iconName: string): React.ElementType {
  const icon = Icons[iconName as IconName]
  return (icon as React.ElementType) || (Icons.LayoutDashboard as React.ElementType)
}

interface DynamicAppSidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function DynamicAppSidebar({ mobileOpen = false, onMobileClose }: DynamicAppSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { config, isLoading } = useWorkspace()

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('pesaby-sidebar-collapsed') === 'true')
  }, [])

  const setSidebarCollapsed = (value: boolean) => {
    setCollapsed(value)
    window.localStorage.setItem('pesaby-sidebar-collapsed', String(value))
  }

  if (isLoading || !config) {
    return (
      <aside className="dashboard-sidebar hidden w-64 flex-col border-r lg:flex">
        <div className="h-16 border-b border-[hsl(var(--sidebar-border))] animate-pulse bg-[hsl(var(--sidebar-hover))]" />
      </aside>
    )
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const primaryNav = config.sidebarConfig.primaryNav
  const secondaryNav = config.sidebarConfig.secondaryNav
  const sidebarWidth = collapsed ? 'lg:w-[68px]' : 'lg:w-[236px]'

  const sidebar = (
    <aside
      className={cn(
        'dashboard-sidebar flex h-full flex-col border-r',
        'transition-all duration-200 ease-in-out',
        'w-72 max-w-[85vw]',
        sidebarWidth
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-border px-4 gap-3',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1">
            <PesabyLogoMark className="h-9 w-9 flex-shrink-0" />
            <div>
              <p className="text-sm font-extrabold leading-tight text-[#050a1f]">Pesaby</p>
              <p className="max-w-36 truncate text-xs text-[#667085]">{config.name}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <PesabyLogoMark className="h-9 w-9" />
        )}
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          className={cn(
            'hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:inline-flex',
            collapsed && 'lg:hidden'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onMobileClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="mx-auto mt-3 hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:inline-flex"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        {!collapsed && (
          <p className="section-label mb-3 px-3 text-[#8a94a5]">Workspace</p>
        )}
        <ul className="space-y-1">
          {primaryNav.map((item) => {
            // Skip items that don't have a route
            if (!item.route) return null
            
            const active = isActive(item.route)
            const IconComponent = getIcon(item.icon) as React.ElementType

            return (
              <li key={item.id}>
                <Link
                  href={item.route}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item',
                    collapsed ? 'lg:justify-center lg:px-0 lg:py-3' : '',
                    active ? 'dashboard-nav-active font-semibold' : 'dashboard-nav-inactive'
                  )}
                >
                  <IconComponent className="h-5 w-5 flex-shrink-0" />
                  <span className={cn('text-sm', collapsed && 'lg:hidden')}>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-border py-3 px-2">
        <ul className="space-y-0.5">
          {secondaryNav.map((item) => {
            const IconComponent = getIcon(item.icon) as React.ElementType
            const active = item.route ? isActive(item.route) : false

            return (
              <li key={item.id}>
                <Link
                  href={item.route || '/dashboard/settings'}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item',
                    collapsed ? 'lg:justify-center lg:px-0 lg:py-2.5' : '',
                    active ? 'dashboard-nav-active font-semibold' : 'dashboard-nav-inactive'
                  )}
                >
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  <span className={cn('text-sm', collapsed && 'lg:hidden')}>{item.label}</span>
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
