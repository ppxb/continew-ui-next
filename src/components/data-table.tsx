import type { ReactTable, RowData } from '@tanstack/react-table'

import { cn } from 'cn'

import { TablePagination } from '@/components/table-pagination'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Button } from '@/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
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
  className
}: DataTableProps<TRow>) {
  const rows = table.getRowModel().rows
  const columnCount = table.getVisibleLeafColumns().length
  const rowCount = table.getRowCount()

  return (
    // The pagination footer owns the bottom padding; without rows there is no footer, so the
    // shell supplies the same 16px itself.
    <div className={cn('flex flex-1 flex-col', rowCount === 0 && 'pb-4')}>
      <Table
        className={cn(
          "**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4",
          isShowingPreviousRows && 'opacity-60 transition-opacity',
          className
        )}
      >
        <TableHeader className="[&_tr]:border-t">
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id} className="py-4 font-normal">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {rows.length ? (
            rows.map(row => (
              <TableRow key={row.id}>
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
                {isError ? (
                  <Empty className="gap-2 p-4">
                    <EmptyHeader>
                      <EmptyTitle>数据加载失败</EmptyTitle>
                    </EmptyHeader>
                    {onRetry ? (
                      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                        重新加载
                      </Button>
                    ) : null}
                  </Empty>
                ) : (
                  <Empty className="gap-2 p-4">
                    <EmptyHeader>
                      <EmptyTitle>{emptyTitle}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TablePagination table={table} />
    </div>
  )
}
