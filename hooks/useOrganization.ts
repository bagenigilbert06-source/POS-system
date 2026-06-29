/**
 * useOrganization Hook
 * Access current organization context throughout the app
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Organization } from '@/lib/types';

// Simple in-memory store for now - replace with Context/Zustand for complex apps
let organizationCache: Organization | null = null;

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization on mount
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setIsLoading(true);

        // Check cache first
        if (organizationCache) {
          setOrganization(organizationCache);
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/organization/current', {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch organization');
        }

        const data = await response.json();
        organizationCache = data;
        setOrganization(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setOrganization(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, []);

  const refetch = useCallback(async () => {
    organizationCache = null;
    setIsLoading(true);

    try {
      const response = await fetch('/api/organization/current', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organization');
      }

      const data = await response.json();
      organizationCache = data;
      setOrganization(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    organization,
    isLoading,
    error,
    refetch,
  };
}
