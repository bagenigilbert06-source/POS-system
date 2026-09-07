/**
 * POS owns its loading boundary so a pending POS request never exposes
 * dashboard placeholder content.
 */
export default function PosLoading() {
  return <RouteLoaderGate cacheKey="pos" />;
}
import { RouteLoaderGate } from '@/components/ui/route-loader-gate';
