import type { MouseEvent } from 'react'

import type { ReactTable, RowData } from '@tanstack/react-table'

import { PaginationArrow } from '@/components/pagination-arrow'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink
} from '@/components/ui/pagination'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DataTableFeatures } from '@/lib/data-table-features'

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50]

type PageItem = number | 'ellipsis-left' | 'ellipsis-right'

/**
 * The page numbers to show, with an ellipsis standing in for the runs left out. The first and the
 * last page are always listed, so a jump back to either end stays one click away.
 */
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

function preventPaginationNavigation(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

interface TablePaginationProps<TRow extends RowData> {
  readonly table: ReactTable<DataTableFeatures, TRow>
}

/** The pagination footer shared by the table screens: page size, row count and the page links. */
export function TablePagination<TRow extends RowData>({ table }: TablePaginationProps<TRow>) {
  const rowCount = table.getRowCount()

  if (rowCount === 0) {
    return null
  }

  const pageCount = Math.max(table.getPageCount(), 1)
  const currentPage = Math.min(table.state.pagination.pageIndex + 1, pageCount)
  const pageNumbers = getPageNumbers(currentPage, pageCount)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4">
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
            <PaginationArrow direction="next" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
