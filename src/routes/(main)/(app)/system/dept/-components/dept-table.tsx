import type { ReactTable } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DeptResp } from '@/lib/api/dept'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { cn } from 'cn'

function TableSkeletonRows({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <TableCell key={colIndex} className="py-4 align-middle">
              <Skeleton className={cn('h-4', colIndex === 0 ? 'w-48' : colIndex === 1 ? 'w-12' : 'w-20')} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

interface DeptTableProps {
  readonly table: ReactTable<DataTableFeatures, DeptResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isStale: boolean
  readonly isFullscreen?: boolean
  readonly onRetry?: () => void
}

export function DeptTable({ table, isLoading, isError, isStale, isFullscreen, onRetry }: DeptTableProps) {
  const rows = table.getExpandedRowModel().rows

  return (
    <div className="flex flex-1 flex-col">
      <Table
        containerClassName={cn(
          'overflow-auto',
          isFullscreen
            ? 'h-[calc(100vh-6.5rem)] max-h-[calc(100vh-6.5rem)]'
            : 'max-h-[calc(100vh-17rem)] md:max-h-[calc(100dvh-17rem)]'
        )}
        className={cn(
          "**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4",
          isStale && 'opacity-60 transition-opacity'
        )}
      >
        <TableHeader className="[&_tr]:border-t">
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  className="sticky top-0 z-10 border-b bg-background py-4 font-normal whitespace-nowrap"
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
              <TableRow key={row.id} className={cn('hover:bg-muted/50', row.getIsSelected() && 'bg-muted/30')}>
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
                    <span className="text-sm text-destructive">数据加载失败</span>
                    {onRetry ? (
                      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                        重新加载
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">暂无数据</span>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
