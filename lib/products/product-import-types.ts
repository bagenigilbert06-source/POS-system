export const PRODUCT_IMPORT_STATUSES = [
  'READY',
  'REVIEW_REQUIRED',
  'EXCLUDED',
  'DUPLICATE',
  'INVALID',
] as const

export type ProductImportStatus = (typeof PRODUCT_IMPORT_STATUSES)[number]

export type ProductImportRow = {
  rowNumber: number
  sku: string
  name: string
  category: string
  sellingPrice: number | null
  barcode: string | null
  openingStock: number | null
  status: ProductImportStatus
  issue: string | null
}

export type ProductImportPreview = {
  totalRows: number
  validRows: number
  invalidRows: number
  warnings: string[]
  errors: Array<{ rowNumber: number; message: string }>
  rows: ProductImportRow[]
  counts: Record<ProductImportStatus, number>
}
