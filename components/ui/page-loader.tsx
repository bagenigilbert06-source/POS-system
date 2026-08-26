export function PageLoader({
  label = 'Loading Pesaby',
  initial = false,
  inline = false,
}: {
  label?: string
  initial?: boolean
  inline?: boolean
}) {
  return (
    <div
      className={`pesaby-global-loader${inline ? ' pesaby-inline-loader' : ''}`}
      data-pesaby-initial-loader={initial ? '' : undefined}
      role="status"
      aria-live="polite"
    >
      <span className="loader" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
