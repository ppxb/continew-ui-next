import type { MouseEvent } from 'react'

import type { ReactTable } from '@tanstack/react-table'

import { cn } from 'cn'

import { PaginationArrow } from '@/components/pagination-arrow'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink
} from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { RoleResp } from '@/lib/api/role'
import type { DataTableFeatures } from '@/lib/data-table-features'

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50]

function preventPaginationNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

type PageItem = number | 'ellipsis-left' | 'ellipsis-right'

function getPageNumbers(currentPage: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', pageCount]
  }

  if (currentPage >= pageCount - 3) {
    return [1, 'ellipsis-left', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
  }

  return [1, 'ellipsis-left', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-right', pageCount]
}

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
                    ? 'mx-auto w-4'
                    : colIndex === 1
                      ? 'mx-auto w-6'
                      : colIndex === 2
                        ? 'w-24'
                        : colIndex === 3
                          ? 'w-20'
                          : colIndex === 4
                            ? 'mx-auto w-16 rounded-full'
                            : 'w-20'
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

interface RoleTableProps {
  readonly table: ReactTable<DataTableFeatures, RoleResp>
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isStale: boolean
  readonly onRetry?: () => void
}

export function RoleTable({ table, isLoading, isError, isStale, onRetry }: RoleTableProps) {
  const pageCount = Math.max(table.getPageCount(), 1)
  const currentPage = Math.min(table.state.pagination.pageIndex + 1, pageCount)
  const pageNumbers = getPageNumbers(currentPage, pageCount)
  const rowCount = table.getRowCount()
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

      {rowCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 pt-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>每页</span>
              <Select
                value={`${table.state.pagination.pageSize}`}
                onValueChange={value => table.setPageSize(Number(value))}
              >
                <SelectTrigger size="sm" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {PAGE_SIZE_OPTIONS.map(pageSize => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <span className="tabular-nums">
              共 {rowCount} 条，第 {currentPage} / {pageCount} 页
            </span>
          </div>

          <Pagination className="mx-0 w-auto justify-start md:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationArrow
                  direction="previous"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                />
              </PaginationItem>
              {pageNumbers.map(item =>
                typeof item === 'number' ? (
                  <PaginationItem key={`page-${item}`}>
                    <PaginationLink
                      href="#"
                      isActive={table.state.pagination.pageIndex === item - 1}
                      onClick={event => {
                        preventPaginationNavigation(event)
                        table.setPageIndex(item - 1)
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationArrow
                  direction="next"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  )
}
