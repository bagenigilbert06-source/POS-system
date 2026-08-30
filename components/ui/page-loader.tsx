'use client'

import { useEffect, useState, type HTMLAttributes } from 'react'

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
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (!initial) return

    const timeout = window.setTimeout(() => setIsDismissed(true), 600)
    return () => window.clearTimeout(timeout)
  }, [initial])

  return (
    <div
      className={`pesaby-global-loader${inline ? ' pesaby-inline-loader' : ''}${isDismissed ? ' pesaby-global-loader--dismissed' : ''}`}
      data-pesaby-initial-loader={initial ? '' : undefined}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <LoadingSpinner className="pesaby-loader--page" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
