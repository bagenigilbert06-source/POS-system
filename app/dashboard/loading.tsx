import { PageLoader } from '@/components/ui/page-loader';

/**
 * The dashboard layout can suspend before a nested route boundary is reached.
 * Keep its fallback to one loader so POS never exposes the dashboard skeleton.
 */
export default function DashboardLoading() {
  return <PageLoader label="Loading Pesaby" inline />;
}
