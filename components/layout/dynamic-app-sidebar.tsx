'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'
import { useState } from 'react'
import { useWorkspace } from '@/lib/context/workspace-context'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

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

  if (isLoading || !config) {
    return (
      <aside className="hidden w-64 flex-col border-r border-border bg-white lg:flex dark:bg-card">
        <div className="h-16 border-b border-[hsl(var(--sidebar-border))] animate-pulse bg-[hsl(var(--sidebar-hover))]" />
      </aside>
    )
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const primaryNav = config.sidebarConfig.primaryNav
  const secondaryNav = config.sidebarConfig.secondaryNav
  const sidebarWidth = collapsed ? 'lg:w-[72px]' : 'lg:w-64'

  const sidebar = (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-white shadow-sm dark:bg-card',
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
            <Image
              src="/imara-logo.png"
              alt="IMARA"
              width={32}
              height={32}
              className="h-8 w-auto flex-shrink-0"
            />
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">IMARA</p>
              <p className="max-w-36 truncate text-xs text-muted-foreground">{config.name}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <Image
            src="/imara-logo.png"
            alt="IMARA"
            width={32}
            height={32}
            className="h-8 w-auto"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
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
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:inline-flex"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        {!collapsed && (
          <p className="section-label mb-3 px-3 text-muted-foreground">Navigation</p>
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
                    active ? 'bg-[#1f5132] text-white shadow-sm hover:bg-[#1f5132]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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

            return (
              <li key={item.id}>
                <Link
                  href={item.route || '/dashboard/settings'}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item',
                    collapsed ? 'lg:justify-center lg:px-0 lg:py-2.5' : '',
                    'text-muted-foreground hover:bg-muted hover:text-foreground'
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
