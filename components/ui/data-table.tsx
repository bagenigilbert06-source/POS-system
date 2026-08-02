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
  striped = true,
  hoverable = true,
  compact = false,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#27272a]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#27272a] bg-[#0f1118] dark:bg-[#0a0d12]">
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  'px-6 py-4 text-left font-semibold text-[#a1a1aa] dark:text-[#a1a1aa] uppercase tracking-wide text-xs',
                  'sticky top-0 bg-[#0f1118] dark:bg-[#0a0d12]',
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
              <td colSpan={columns.length} className="px-6 py-12 text-center text-[#a1a1aa]">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-[#27272a] transition-all',
                  striped && index % 2 === 0 && 'bg-[#111827]/40',
                  hoverable && 'hover:bg-[#111827]/60 cursor-pointer',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'text-[#fafafa] dark:text-[#fafafa]',
                      compact ? 'px-6 py-3' : 'px-6 py-4',
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
