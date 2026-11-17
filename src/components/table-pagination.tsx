import { useState, type MouseEvent } from 'react'

import type { ReactTable, RowData } from '@tanstack/react-table'
import { Root as AnimatePagination } from '@animate-ui/react/primitives/pagination'

import { cn } from 'cn'

import { PaginationArrow } from '@/components/pagination-arrow'
import { Input } from '@/components/ui/input'
import { PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink } from '@/components/ui/pagination'
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

export interface TablePaginationOptions {
  /** Aligns the entire pagination group. Defaults to right. */
  readonly align?: 'left' | 'center' | 'right'
  /** Shows the page-number input. Defaults to true. */
  readonly showQuickJumper?: boolean
}

const ALIGN_CLASSES = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end'
} as const

function PageJumper({ pageCount, onJump }: { pageCount: number; onJump: (page: number) => void }) {
  const [value, setValue] = useState('')
  const jump = () => {
    const text = value.trim()
    setValue('')
    if (!/^\d+$/.test(text)) return
    const page = Number(text)
    if (!Number.isSafeInteger(page)) return
    onJump(Math.min(Math.max(page, 1), pageCount))
  }

  return (
    <label className="flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
      <span>跳至</span>
      <Input
        aria-label="跳转页码"
        title={`输入 1 至 ${pageCount} 页，按 Enter 跳转`}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        className="h-8 w-14 text-center tabular-nums"
        onChange={event => setValue(event.target.value)}
        onBlur={jump}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            jump()
          }
        }}
      />
      <span>页</span>
    </label>
  )
}

interface TablePaginationProps<TRow extends RowData> extends TablePaginationOptions {
  readonly table: ReactTable<DataTableFeatures, TRow>
  /** A fill-height table keeps the last row's border, so the footer drops its own top border. */
  readonly showTopBorder?: boolean
}

/** Shared pagination footer: total, page links, page size and an optional quick jumper. */
export function TablePagination<TRow extends RowData>({ table, showTopBorder = true, align = 'right', showQuickJumper = true }: TablePaginationProps<TRow>) {
  const rowCount = table.getRowCount()

  if (rowCount === 0) {
    return null
  }

  const pageCount = Math.max(table.getPageCount(), 1)
  const currentPage = Math.min(table.state.pagination.pageIndex + 1, pageCount)
  const pageNumbers = getPageNumbers(currentPage, pageCount)

  return (
    <div className={cn('flex flex-wrap items-center gap-3 px-4 py-4', ALIGN_CLASSES[align], showTopBorder && 'border-t')}>
      <span className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">共 {rowCount} 条</span>

      <AnimatePagination
        role="navigation"
        aria-label="pagination"
        className="mx-0 flex w-auto"
      >
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
      </AnimatePagination>
      <Select
        value={`${table.state.pagination.pageSize}`}
        onValueChange={value => { if (value !== null) table.setPageSize(Number(value)) }}
      >
        <SelectTrigger size="sm" className="h-8 w-28" aria-label="每页条数">
          <SelectValue>{table.state.pagination.pageSize} 条/页</SelectValue>
        </SelectTrigger>
        <SelectContent side="top">
          <SelectGroup>
            {PAGE_SIZE_OPTIONS.map(pageSize => (
              <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize} 条/页</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {showQuickJumper ? (
        <PageJumper
          key={`${currentPage}:${pageCount}:${table.state.pagination.pageSize}`}
          pageCount={pageCount}
          onJump={page => { if (page !== currentPage) table.setPageIndex(page - 1) }}
        />
      ) : null}
    </div>
  )
}
