import type { ReactTable } from '@tanstack/react-table'

import { cn } from 'cn'

import { TablePagination } from '@/components/table-pagination'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { UserResp } from '@/lib/api/user'
import type { DataTableFeatures } from '@/lib/data-table-features'

function TableSkeletonRows({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <TableCell key={colIndex} className="py-4 align-middle">
              <Skeleton
                className={cn(
                  'h-4',
                  colIndex === 0
                    ? 'mx-auto w-6'
                    : colIndex === 1
                      ? 'w-24'
                      : colIndex === 2
                        ? 'w-20'
                        : colIndex === 3
                          ? 'mx-auto w-12 rounded-full'
                          : colIndex === 4
                            ? 'mx-auto w-8'
                            : 'w-24'
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

interface UserTableProps {
  readonly table: ReactTable<DataTableFeatures, UserResp>
  readonly isLoading: boolean
  readonly isError: boolean
  /** The rows on screen come from the previous query, or a refetch failed. */
  readonly isStale: boolean
  readonly onRetry?: () => void
}

/** The table itself plus the server-side pagination footer. */
export function UserTable({ table, isLoading, isError, isStale, onRetry }: UserTableProps) {
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-1 flex-col">
      <Table
        className={cn(
          "**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4",
          isStale && 'opacity-60 transition-opacity'
        )}
      >
        <TableHeader className="[&_tr]:border-t">
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id} className="py-4 font-normal whitespace-nowrap">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {rows.length ? (
            rows.map(row => (
              <TableRow key={row.id} className="hover:bg-muted/50">
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="py-4 align-middle">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : isLoading ? (
            <TableSkeletonRows columnCount={table.getVisibleLeafColumns().length} />
          ) : (
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-32 text-center">
                {isError ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">数据加载失败</span>
                    {onRetry ? (
                      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                        重新加载
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">暂无数据</span>
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
