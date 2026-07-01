'use client'

import { useState } from 'react'
import { DynamicAppSidebar } from './dynamic-app-sidebar'
import { AppNavbar } from './app-navbar'
import { WorkspaceProvider } from '@/lib/context/workspace-context'
import type { WorkspaceConfig } from '@/lib/types/workspace'

interface DashboardLayoutClientProps {
  userId: string
  userName?: string | null
  userEmail?: string | null
  organizationId: string
  organizationName: string
  /**
   * Server-resolved WorkspaceConfig passed from the layout Server Component.
   * Providing this avoids a client-side fetch to load the workspace on mount.
   */
  initialWorkspaceConfig?: WorkspaceConfig
  children: React.ReactNode
}

export function DashboardLayoutClient({
  userId,
  userName,
  userEmail,
  organizationId,
  organizationName,
  initialWorkspaceConfig,
  children,
}: DashboardLayoutClientProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <WorkspaceProvider
      workspaceId={organizationId}
      initialConfig={initialWorkspaceConfig}
    >
      <div className="flex min-h-screen overflow-hidden bg-[#f6f6f3] text-foreground dark:bg-background">
        <DynamicAppSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppNavbar
            userName={userName}
            userEmail={userEmail}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  )
}
