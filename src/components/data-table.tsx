import type { ReactTable, RowData } from '@tanstack/react-table'

import { cn } from 'cn'

import { QueryState } from '@/components/query-state'
import { TablePagination } from '@/components/table-pagination'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface DataTableProps<TRow extends RowData> {
  readonly table: ReactTable<DataTableFeatures, TRow>
  readonly isLoading: boolean
  readonly isError: boolean
  /** The rows on screen belong to the previous query while the next page loads. */
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
  /** One skeleton width per column, so a screen can imitate its own cell shapes. */
  readonly skeletonWidths?: readonly string[]
  readonly emptyTitle?: string
  /** Extra table classes for a screen that needs a denser or wider layout. */
  readonly className?: string
  /** Tree tables scroll their own container and pin the header while the rows move. */
  readonly stickyHeader?: boolean
  /** Tree tables render every row, so they opt out of the footer. */
  readonly showPagination?: boolean
  /** Layout classes for the wrapper, used by the tree screens for their scroll height. */
  readonly containerClassName?: string
}

/**
 * The business table shell: header and body, loading, empty and error states, and the pagination
 * footer. Screens keep their columns, queries and toolbars; the shared density and state blocks
 * live here so every list looks the same.
 */
export function DataTable<TRow extends RowData>({
  table,
  isLoading,
  isError,
  isShowingPreviousRows,
  onRetry,
  skeletonWidths,
  emptyTitle = '暂无数据',
  className,
  stickyHeader = false,
  showPagination = true,
  containerClassName
}: DataTableProps<TRow>) {
  const rows = table.getExpandedRowModel().rows
  const columnCount = table.getVisibleLeafColumns().length
  const rowCount = table.getRowCount()
  const hasFooter = showPagination && rowCount > 0

  return (
    // The pagination footer owns the bottom padding; without a footer the shell supplies the same
    // 16px itself.
    <div className={cn('flex flex-1 flex-col', !hasFooter && 'pb-4', containerClassName)}>
      <Table
        className={cn(
          "**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4",
          isShowingPreviousRows && !isError && 'opacity-60 transition-opacity',
          className
        )}
      >
        {/* The sticky cells below draw their own top edge, so the row must not add one. */}
        <TableHeader className={cn(!stickyHeader && '[&_tr]:border-t')}>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'py-4 font-normal',
                    // A collapsed table paints its borders as one grid below the sticky cell, so the
                    // header draws its edges itself: the bottom one sits on the collapsed border it
                    // replaces, the top one just inside the cell where the scroll port cannot clip it.
                    stickyHeader &&
                      cn(
                        'sticky top-0 z-10 bg-background',
                        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border before:content-['']",
                        "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-border after:content-['']"
                      )
                  )}
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {rows.length ? (
            rows.map(row => (
              <TableRow key={row.id} className={cn(row.getIsSelected() && 'bg-muted/30')}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="py-4">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : isLoading ? (
            <TableSkeletonRows table={table} widths={skeletonWidths} />
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="h-32">
                <QueryState
                  state={isError ? 'error' : 'empty'}
                  title={isError ? '数据加载失败' : emptyTitle}
                  onRetry={isError ? onRetry : undefined}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {showPagination ? <TablePagination table={table} /> : null}
    </div>
  )
}
