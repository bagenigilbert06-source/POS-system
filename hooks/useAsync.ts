/**
 * useAsync Hook
 * Generic async data fetching hook with loading and error states
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  dependencies?: React.DependencyList;
  autoFetch?: boolean;
}

interface UseAsyncReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAsync<T>(asyncFunction: () => Promise<T>, options: UseAsyncOptions<T> = {}): UseAsyncReturn<T> {
  const { onSuccess, onError, dependencies = [], autoFetch = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await asyncFunction();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [asyncFunction, onSuccess, onError]);

  useEffect(() => {
    if (autoFetch) {
      execute();
    }
  }, [autoFetch, execute, ...dependencies]);

  return {
    data,
    isLoading,
    error,
    refetch: execute,
  };
}
