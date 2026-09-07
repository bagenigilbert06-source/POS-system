/**
 * The dashboard layout can suspend before a nested route boundary is reached.
 * Keep its fallback to one loader so POS never exposes the dashboard skeleton.
 */
export default function DashboardLoading() {
  return <RouteFallback label="Loading Pesaby" />;
}
import { RouteFallback } from '@/components/ui/route-fallback';
