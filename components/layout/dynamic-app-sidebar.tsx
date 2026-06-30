'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import * as Icons from 'lucide-react'
import { useState } from 'react'
import { useWorkspace } from '@/lib/context/workspace-context'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'

type IconName = keyof typeof Icons

function getIcon(iconName: string) {
  const icon = Icons[iconName as IconName]
  return icon || Icons.LayoutDashboard
}

export function DynamicAppSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { config, isLoading } = useWorkspace()

  if (isLoading || !config) {
    return (
      <aside className="flex flex-col bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] w-56">
        <div className="h-16 border-b border-[hsl(var(--sidebar-border))] animate-pulse bg-[hsl(var(--sidebar-hover))]" />
      </aside>
    )
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const primaryNav = config.sidebarConfig.primaryNav
  const secondaryNav = config.sidebarConfig.secondaryNav

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
          <div className="flex items-center gap-2 flex-1">
            <Image
              src="/imara-logo.png"
              alt="IMARA"
              width={32}
              height={32}
              className="h-8 w-auto flex-shrink-0"
            />
            <div>
              <p className="font-semibold text-white text-xs leading-tight">IMARA</p>
              <p className="text-xs text-[hsl(var(--sidebar-fg))]">{config.name}</p>
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
          {primaryNav.map((item) => {
            // Skip items that don't have a route
            if (!item.route) return null
            
            const active = isActive(item.route)
            const IconComponent = getIcon(item.icon)

            return (
              <li key={item.id}>
                <Link
                  href={item.route}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item',
                    collapsed ? 'justify-center px-0 py-3' : '',
                    active ? 'sidebar-item-active' : 'sidebar-item-inactive'
                  )}
                >
                  <IconComponent className="h-4.5 w-4.5 flex-shrink-0" />
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
          {secondaryNav.map((item) => {
            const IconComponent = getIcon(item.icon)

            return (
              <li key={item.id}>
                <Link
                  href={item.route || '/dashboard/settings'}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'sidebar-item',
                    collapsed ? 'justify-center px-0 py-2.5' : '',
                    'sidebar-item-inactive'
                  )}
                >
                  <IconComponent className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
