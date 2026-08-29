'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DataTableColumn<T> {
  id: string
  header: string
  accessor: (item: T) => ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  rowKey: (item: T) => string | number
  onRowClick?: (item: T) => void
  striped?: boolean
  hoverable?: boolean
  compact?: boolean
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  striped = false,
  hoverable = true,
  compact = false,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  'sticky top-0 bg-muted/40 px-4 py-3 text-left text-xs font-semibold text-muted-foreground',
                  column.width
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b transition-colors last:border-0',
                  striped && index % 2 === 0 && 'bg-muted/20',
                  hoverable && 'hover:bg-muted/35 cursor-pointer',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'text-foreground',
                      compact ? 'px-4 py-2.5' : 'px-4 py-3',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {column.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
