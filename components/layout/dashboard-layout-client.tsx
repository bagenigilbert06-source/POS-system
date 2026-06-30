'use client'

import { DynamicAppSidebar } from './dynamic-app-sidebar'
import { AppNavbar } from './app-navbar'
import { WorkspaceProvider } from '@/lib/context/workspace-context'

interface DashboardLayoutClientProps {
  userId: string
  userName?: string | null
  userEmail?: string | null
  organizationId: string
  organizationName: string
  children: React.ReactNode
}

export function DashboardLayoutClient({
  userId,
  userName,
  userEmail,
  organizationId,
  organizationName,
  children,
}: DashboardLayoutClientProps) {
  return (
    <WorkspaceProvider workspaceId={organizationId}>
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
