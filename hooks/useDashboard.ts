/**
 * useDashboard Hook
 * Fetch dashboard statistics and data
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DashboardStats } from '@/lib/types';

interface UseDashboardOptions {
  startDate?: Date;
  endDate?: Date;
  businessType?: string;
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const { autoFetch = true, refreshInterval = 0 } = options;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams();
      if (options.startDate) queryParams.append('startDate', options.startDate.toISOString());
      if (options.endDate) queryParams.append('endDate', options.endDate.toISOString());
      if (options.businessType) queryParams.append('businessType', options.businessType);

      const response = await fetch(`/api/dashboard/stats?${queryParams.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  useEffect(() => {
    if (!autoFetch) return;

    fetchStats();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoFetch, refreshInterval, fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
