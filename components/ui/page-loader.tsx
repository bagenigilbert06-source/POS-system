import type { HTMLAttributes } from 'react'

type LoadingSpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string
}

/** The single, theme-aware loading indicator used throughout Pesaby. */
export function LoadingSpinner({
  className = '',
  label,
  ...props
}: LoadingSpinnerProps) {
  return (
    <span
      className={`pesaby-loader ${className}`.trim()}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    />
  )
}

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
      <LoadingSpinner className="pesaby-loader--page" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
