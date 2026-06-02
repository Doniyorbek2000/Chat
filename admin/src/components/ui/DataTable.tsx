'use client'

import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  loading?: boolean
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  onSelectionChange?: (selected: TData[]) => void
  emptyMessage?: string
  className?: string
}

export default function DataTable<TData>({
  data,
  columns,
  loading = false,
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  onSelectionChange,
  emptyMessage = 'No data found',
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(newSelection)
      if (onSelectionChange) {
        const selectedRows = Object.keys(newSelection)
          .filter((key) => newSelection[key])
          .map((key) => data[parseInt(key)])
        onSelectionChange(selectedRows)
      }
    },
    state: { sorting, rowSelection },
    enableRowSelection: !!onSelectionChange,
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  })

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/5 bg-white/2">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="table-header px-4 py-3 text-left first:pl-5 last:pr-5 whitespace-nowrap"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          header.column.getCanSort() && 'cursor-pointer select-none hover:text-white transition-colors'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="ml-1">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUpIcon className="w-3.5 h-3.5" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDownIcon className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronUpDownIcon className="w-3.5 h-3.5 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3 first:pl-5 last:pr-5">
                      <div className="h-4 bg-white/5 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-dark-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'hover:bg-white/2 transition-colors',
                    row.getIsSelected() && 'bg-primary-500/5'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="table-cell first:pl-5 last:pr-5 whitespace-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(total > 0 || loading) && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3 text-dark-400">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, total)}–
              {Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(1)}
              disabled={page === 1 || loading}
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronDoubleLeftIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1 || loading}
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  disabled={loading}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                    pageNum === page
                      ? 'bg-primary-600 text-white'
                      : 'text-dark-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {pageNum}
                </button>
              )
            })}

            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page === totalPages || loading}
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange?.(totalPages)}
              disabled={page === totalPages || loading}
              className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronDoubleRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
