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
  branchName?: string | null
  /**
   * Server-resolved WorkspaceConfig passed from the layout Server Component.
   * Providing this avoids a client-side fetch to load the workspace on mount.
   */
  initialWorkspaceConfig?: WorkspaceConfig
  setupChecklist?: React.ReactNode
  children: React.ReactNode
}

export function DashboardLayoutClient({
  userId,
  userName,
  userEmail,
  organizationId,
  organizationName,
  branchName,
  initialWorkspaceConfig,
  setupChecklist,
  children,
}: DashboardLayoutClientProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <WorkspaceProvider
      workspaceId={organizationId}
      initialConfig={initialWorkspaceConfig}
    >
      <div className="dashboard-shell flex min-h-screen overflow-hidden font-sans">
        <a href="#dashboard-content" className="skip-link">Skip to main content</a>
        <DynamicAppSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppNavbar
            userName={userName}
            userEmail={userEmail}
            organizationName={organizationName}
            branchName={branchName}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
          />
          <main id="dashboard-content" tabIndex={-1} className="flex-1 overflow-y-auto px-3 py-4 outline-none sm:px-5 lg:px-6 xl:px-7">
            {setupChecklist}
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  )
}
