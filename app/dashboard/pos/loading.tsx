import { PageLoader } from '@/components/ui/page-loader';

/**
 * POS owns its loading boundary so a pending POS request never exposes
 * dashboard placeholder content.
 */
export default function PosLoading() {
  return <PageLoader label="Opening POS" inline />;
}
