import type { ReactTable } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MenuResp } from '@/lib/api/menu'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { cn } from 'cn'

function TableSkeletonRows({ columnCount }: { columnCount: number }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columnCount }).map((_, colIndex) => (
            <TableCell key={colIndex} className="py-4 align-middle">
              <Skeleton className={cn('h-4', colIndex === 0 ? 'w-48' : colIndex === 1 ? 'mx-auto w-12' : 'w-20')} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

interface MenuTableProps {
  readonly table: ReactTable<DataTableFeatures, MenuResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isStale: boolean
  readonly total: number
  readonly onRetry?: () => void
}

export function MenuTable({ table, isLoading, isError, isStale, total, onRetry }: MenuTableProps) {
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 pt-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="tabular-nums">共 {total} 项菜单节点</span>
        </div>
      </div>
    </div>
  )
}
