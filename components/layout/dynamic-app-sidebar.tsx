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
