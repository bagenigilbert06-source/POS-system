'use client'

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
  return (
    <WorkspaceProvider
      workspaceId={organizationId}
      initialConfig={initialWorkspaceConfig}
    >
      <div className="flex h-screen overflow-hidden bg-background">
        <DynamicAppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppNavbar userName={userName} userEmail={userEmail} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  )
}
