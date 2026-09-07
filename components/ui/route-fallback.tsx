/**
 * Server-only route fallback. It avoids shipping a client loading component for
 * route transitions and appears only after the brief slow-request threshold.
 */
export function RouteFallback({ label }: { label: string }) {
  return (
    <div
      className="pesaby-global-loader pesaby-inline-loader dashboard-route-loader"
      role="status"
      aria-label={label}
    >
      <span className="pesaby-loader pesaby-loader--page" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
