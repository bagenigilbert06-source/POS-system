import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const shared = {
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Penguin UI-style inline SVG: cash received from completed sales. */
export function SalesCashIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M3.75 6.75h16.5v10.5H3.75z" />
      <path d="M3.75 9A2.25 2.25 0 0 0 6 6.75M18 6.75A2.25 2.25 0 0 0 20.25 9M3.75 15A2.25 2.25 0 0 1 6 17.25M18 17.25A2.25 2.25 0 0 1 20.25 15" />
      <circle cx="12" cy="12" r="2.25" />
    </svg>
  )
}

/** Penguin UI-style inline SVG: an individual POS receipt. */
export function TransactionReceiptIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="M6.75 3.75h10.5v16.5L15.5 19l-1.75 1.25L12 19l-1.75 1.25L8.5 19l-1.75 1.25V3.75Z" />
      <path d="M9.25 8h5.5M9.25 11.25h5.5M9.25 14.5h3.25" />
    </svg>
  )
}

/** Penguin UI-style inline SVG: average value across completed sales. */
export function AverageSaleIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M14.5 8.75h-3.25a1.75 1.75 0 1 0 0 3.5h1.5a1.75 1.75 0 1 1 0 3.5H9.5M12 7.25v1.5M12 15.75v1.5" />
    </svg>
  )
}

/** Penguin UI-style inline SVG: inventory that requires inspection/reordering. */
export function ReorderStockIcon(props: IconProps) {
  return (
    <svg {...shared} {...props}>
      <path d="m4.5 7.25 7.5-4 7.5 4-7.5 4-7.5-4Z" />
      <path d="M4.5 7.25v8.5l7.5 4 3.25-1.75M12 11.25v8.5M19.5 7.25v5" />
      <circle cx="17.25" cy="16" r="2.75" />
      <path d="m19.25 18 2 2" />
    </svg>
  )
}
