/**
 * The dashboard layout can suspend before a nested route boundary is reached.
 * Keep its fallback to one loader so POS never exposes the dashboard skeleton.
 */
export default function DashboardLoading() {
  return <RouteLoaderGate cacheKey="dashboard" />;
}
import { RouteLoaderGate } from '@/components/ui/route-loader-gate';
