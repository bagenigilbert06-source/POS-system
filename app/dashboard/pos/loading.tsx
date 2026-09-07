import { PageLoader } from '@/components/ui/page-loader';

/**
 * POS owns its loading boundary so it never falls back to the dashboard
 * skeleton. The short delay prevents a distracting flash on cached routes.
 */
export default function PosLoading() {
  return <PageLoader label="Opening POS" inline delayMs={150} />;
}
