import type { ReactTable } from '@tanstack/react-table'

import { cn } from 'cn'

import { TablePagination } from '@/components/table-pagination'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { LogResp } from '@/lib/api/log'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface LogTableProps {
  readonly table: ReactTable<DataTableFeatures, LogResp>
  readonly isLoading: boolean
  readonly isError: boolean
  /** The rows on screen belong to the previous query while the next page loads. */
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
}

/** One skeleton width per column id, so hidden columns cannot shift the placeholder shapes. */
const SKELETON_WIDTHS: Record<string, string> = {
  index: 'mx-auto w-6',
  createTime: 'w-28',
  createUserString: 'w-20',
  description: 'w-32',
  module: 'mx-auto w-16',
  status: 'mx-auto w-14 rounded-full',
  ip: 'w-24',
  address: 'w-28',
  timeTaken: 'mx-auto w-12 rounded-full',
  browser: 'w-20',
  os: 'w-20'
}

/** The table itself plus the server-side pagination footer. */
export function LogTable({ table, isLoading, isError, isShowingPreviousRows, onRetry }: LogTableProps) {
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-1 flex-col">
      <Table
        className={cn(
          "**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4",
          isShowingPreviousRows && 'opacity-60 transition-opacity'
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
            <TableSkeletonRows
              table={table}
              widths={table.getVisibleLeafColumns().map(column => SKELETON_WIDTHS[column.id] ?? 'w-24')}
            />
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
