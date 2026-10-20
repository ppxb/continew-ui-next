import type { ReactTable } from '@tanstack/react-table'

import { cn } from 'cn'

import { TablePagination } from '@/components/table-pagination'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { JobResp } from '@/lib/api/job'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface JobTableProps {
  readonly table: ReactTable<DataTableFeatures, JobResp>
  readonly isLoading: boolean
  readonly isError: boolean
  /** The rows on screen belong to the previous query while the next page loads. */
  readonly isShowingPreviousRows: boolean
  readonly onRetry?: () => void
}

/** One skeleton width per column id, so hidden columns cannot shift the placeholder shapes. */
const SKELETON_WIDTHS: Record<string, string> = {
  index: 'mx-auto w-6',
  jobName: 'w-32',
  triggerType: 'w-32',
  taskType: 'w-28',
  jobStatus: 'mx-auto w-10 rounded-full',
  description: 'w-32',
  createDt: 'w-32',
  updateDt: 'w-32',
  actions: 'mx-auto w-8'
}

/** The table itself plus the server-side pagination footer. */
export function JobTable({ table, isLoading, isError, isShowingPreviousRows, onRetry }: JobTableProps) {
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-1 flex-col">
      <Table
        className={cn(
          "**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4",
          isShowingPreviousRows && !isError && 'opacity-60 transition-opacity'
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
          {isError ? (
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="text-xs text-muted-foreground">数据加载失败</span>
                  {onRetry ? (
                    <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                      重新加载
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ) : rows.length ? (
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
                <span className="text-xs text-muted-foreground">暂无数据</span>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TablePagination table={table} />
    </div>
  )
}
