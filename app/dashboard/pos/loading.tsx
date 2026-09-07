/**
 * POS owns its loading boundary so a pending POS request never exposes
 * dashboard placeholder content.
 */
export default function PosLoading() {
  return (
    <div className="pesaby-global-loader pesaby-inline-loader dashboard-route-loader" role="status" aria-label="Opening POS">
      <span className="pesaby-loader pesaby-loader--page" />
    </div>
  );
}
