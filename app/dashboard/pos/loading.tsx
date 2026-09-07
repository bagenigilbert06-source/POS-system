/**
 * POS owns its loading boundary so a pending POS request never exposes
 * dashboard placeholder content.
 */
export default function PosLoading() {
  return <RouteFallback label="Opening POS" />;
}
import { RouteFallback } from '@/components/ui/route-fallback';
