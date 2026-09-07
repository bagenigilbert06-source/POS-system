/**
 * The dashboard layout can suspend before a nested route boundary is reached.
 * Keep its fallback to one loader so POS never exposes the dashboard skeleton.
 */
export default function DashboardLoading() {
  return (
    <div
      className="pesaby-global-loader pesaby-inline-loader"
      role="status"
      aria-label="Loading Pesaby"
    >
      <span className="pesaby-loader pesaby-loader--page" />
    </div>
  );
}
