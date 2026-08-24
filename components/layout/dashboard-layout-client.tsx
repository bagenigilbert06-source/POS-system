'use client';

import { Children, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DynamicAppSidebar } from './dynamic-app-sidebar';
import { AppNavbar } from './app-navbar';
import { WorkspaceProvider } from '@/lib/context/workspace-context';
import type { WorkspaceConfig } from '@/lib/types/workspace';
import { getBusinessExperience } from '@/lib/workspace/business-experience';
import type { PermissionEnum } from '@/lib/types/permissions';

interface DashboardLayoutClientProps {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  organizationId: string;
  organizationName: string;
  availableOrganizations: Array<{ id: string; name: string; businessType: string }>;
  branchName?: string | null;
  /**
   * Server-resolved WorkspaceConfig passed from the layout Server Component.
   * Providing this avoids a client-side fetch to load the workspace on mount.
   */
  initialWorkspaceConfig?: WorkspaceConfig;
  role?: string;
  permissions: readonly PermissionEnum[];
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  userId,
  userName,
  userEmail,
  userImage,
  organizationId,
  organizationName,
  availableOrganizations,
  branchName,
  initialWorkspaceConfig,
  role,
  permissions,
  children,
}: DashboardLayoutClientProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const adminMode =
    pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/');
  const experience = initialWorkspaceConfig
    ? getBusinessExperience(
        initialWorkspaceConfig.businessType,
        initialWorkspaceConfig.businessCategory
      )
    : null;

  return (
    <WorkspaceProvider
      workspaceId={organizationId}
      initialConfig={initialWorkspaceConfig}
    >
      <div className="dashboard-shell flex h-dvh min-h-0 overflow-hidden font-sans">
        <a href="#dashboard-content" className="skip-link">
          Skip to main content
        </a>
        <DynamicAppSidebar
          initialPermissions={permissions}
          initialRole={role}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppNavbar
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
            organizationName={organizationName}
            organizationId={organizationId}
            availableOrganizations={availableOrganizations}
            branchName={branchName}
            workspaceDescription={
              experience?.overviewDescription ?? 'Operating workspace'
            }
            role={role}
            permissions={permissions}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
          />
          <main
            id="dashboard-content"
            tabIndex={-1}
            className="dashboard-scroll-region min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 outline-none sm:px-6 sm:py-5 lg:px-7 lg:py-5"
          >
            {Children.toArray(children)}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
