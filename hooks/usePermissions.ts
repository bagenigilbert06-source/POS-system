/**
 * usePermissions Hook
 * Check user permissions and roles
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PermissionEnum, RoleEnum } from '@/lib/types';

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionEnum[]>([]);
  const [role, setRole] = useState<RoleEnum | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/permissions', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }

        const data = await response.json();
        setPermissions(data.permissions || []);
        setRole(data.role);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = useCallback(
    (permission: PermissionEnum | string): boolean => {
      return permissions.includes(permission as PermissionEnum);
    },
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (permissionsList: (PermissionEnum | string)[]): boolean => {
      return permissionsList.some((p) => permissions.includes(p as PermissionEnum));
    },
    [permissions],
  );

  const hasAllPermissions = useCallback(
    (permissionsList: (PermissionEnum | string)[]): boolean => {
      return permissionsList.every((p) => permissions.includes(p as PermissionEnum));
    },
    [permissions],
  );

  const isOwner = useCallback((): boolean => {
    return role === 'owner';
  }, [role]);

  const isManager = useCallback((): boolean => {
    return role === 'owner' || role === 'manager';
  }, [role]);

  return {
    permissions,
    role,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isManager,
  };
}
