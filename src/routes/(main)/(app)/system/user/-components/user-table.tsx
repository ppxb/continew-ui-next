import type { MouseEvent } from 'react'

import type { ReactTable } from '@tanstack/react-table'

import { cn } from 'cn'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { UserResp } from '@/lib/api/user'
import type { DataTableFeatures } from '@/lib/data-table-features'

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50]

function preventPaginationNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

function getPageNumbers(currentPage: number, pageCount: number) {
  if (pageCount <= 3) {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }

  if (currentPage <= 2) return [1, 2, 3]
  if (currentPage >= pageCount - 1) return [pageCount - 2, pageCount - 1, pageCount]

  return [currentPage - 1, currentPage, currentPage + 1]
}

interface UserTableProps {
  readonly table: ReactTable<DataTableFeatures, UserResp>
  readonly isLoading: boolean
  readonly isError: boolean
  /** The rows on screen come from the previous query, or a refetch failed. */
  readonly isStale: boolean
}

/** The table itself plus the server-side pagination footer. */
export function UserTable({ table, isLoading, isError, isStale }: UserTableProps) {
  const pageCount = Math.max(table.getPageCount(), 1)
  const currentPage = Math.min(table.state.pagination.pageIndex + 1, pageCount)
  const pageNumbers = getPageNumbers(currentPage, pageCount)
  const rowCount = table.getRowCount()
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-1 flex-col gap-4">
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
          ) : (
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                {isLoading ? (
                  <Spinner className="mx-auto" />
                ) : isError ? (
                  <span className="text-destructive">加载失败，请稍后重试</span>
                ) : (
                  <span className="text-muted-foreground">暂无数据</span>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {rowCount > 0 ? (
        <>
          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
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
                  <PaginationPrevious
                    href="#"
                    text=""
                    className={!table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : undefined}
                    onClick={event => {
                      preventPaginationNavigation(event)
                      table.previousPage()
                    }}
                  />
                </PaginationItem>
                {pageNumbers[0] > 1 ? (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : null}
                {pageNumbers.map(pageNumber => (
                  <PaginationItem key={`page-${pageNumber}`}>
                    <PaginationLink
                      href="#"
                      isActive={table.state.pagination.pageIndex === pageNumber - 1}
                      onClick={event => {
                        preventPaginationNavigation(event)
                        table.setPageIndex(pageNumber - 1)
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {pageNumbers[pageNumbers.length - 1] < pageCount ? (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : null}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text=""
                    className={!table.getCanNextPage() ? 'pointer-events-none opacity-50' : undefined}
                    onClick={event => {
                      preventPaginationNavigation(event)
                      table.nextPage()
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </>
      ) : null}
    </div>
  )
}
