'use client';

import { useEffect, useState } from 'react';

/**
 * Loading boundaries render before a server response completes. Once a route
 * has completed in this tab, keep its transient fallback hidden on subsequent
 * visits; the already-warm route and server caches supply the content instead.
 */
export function RouteLoaderGate({ cacheKey }: { cacheKey: string }) {
  const storageKey = `pesaby:route-ready:${cacheKey}`;
  // Start hidden during hydration. This prevents a one-frame loader flash for
  // a route that was already completed in this tab.
  const [hasLoaded, setHasLoaded] = useState(true);

  useEffect(() => {
    setHasLoaded(sessionStorage.getItem(storageKey) === '1');
    sessionStorage.setItem(storageKey, '1');
  }, [storageKey]);

  if (hasLoaded) return null;

  return (
    <div
      className="pesaby-global-loader pesaby-inline-loader dashboard-route-loader"
      role="status"
      aria-label="Loading Pesaby"
    >
      <span className="pesaby-loader pesaby-loader--page" />
    </div>
  );
}
