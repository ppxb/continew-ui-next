import * as React from 'react'

import type { Column, ReactTable, RowData } from '@tanstack/react-table'

import { cn } from 'cn'

import { QueryState } from '@/components/query-state'
import { TablePagination, type TablePaginationOptions } from '@/components/table-pagination'
import { TableSkeletonRows } from '@/components/table-skeleton-rows'
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
  /** Tree tables scroll their own container and pin the header while the rows move. */
  readonly stickyHeader?: boolean
  /** Tree tables render every row, so they opt out of the footer. */
  readonly showPagination?: boolean
  readonly pagination?: TablePaginationOptions
  /** Layout classes for the wrapper, used by the tree screens for their scroll height. */
  readonly containerClassName?: string
  /** Fill the remaining height and scroll the rows inside the table instead of the page. */
  readonly fillHeight?: boolean
}

type PinnedOffsets = Readonly<Record<string, number>>
const NO_OFFSETS: PinnedOffsets = {}

/**
 * Sticky offsets of pinned columns, measured from the rendered header cells: the columns size to
 * their content, so the offsets must follow the real widths rather than column size settings.
 */
function usePinnedOffsets(headerRowRef: React.RefObject<HTMLTableRowElement | null>, pinnedKey: string) {
  const [offsets, setOffsets] = React.useState(NO_OFFSETS)

  React.useLayoutEffect(() => {
    const row = headerRowRef.current
    const [startIds, endIds] = pinnedKey.split('|').map(ids => (ids ? ids.split(',') : []))
    if (!row || (!startIds.length && !endIds.length)) {
      setOffsets(NO_OFFSETS)
      return
    }
    const cells = new Map(
      Array.from(row.querySelectorAll<HTMLElement>('[data-column-id]'), cell => [cell.dataset.columnId!, cell])
    )
    const measure = () => {
      const next: Record<string, number> = {}
      let left = 0
      for (const id of startIds) {
        next[id] = left
        left += cells.get(id)?.getBoundingClientRect().width ?? 0
      }
      let right = 0
      for (let i = endIds.length - 1; i >= 0; i--) {
        next[endIds[i]] = right
        right += cells.get(endIds[i])?.getBoundingClientRect().width ?? 0
      }
      setOffsets(current =>
        Object.keys(next).length === Object.keys(current).length &&
        Object.entries(next).every(([id, offset]) => current[id] === offset)
          ? current
          : next
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const cell of cells.values()) observer.observe(cell)
    return () => observer.disconnect()
  }, [headerRowRef, pinnedKey])

  return offsets
}

/**
 * Sticky position and inner edge for a pinned column's cells; unpinned columns get nothing.
 * Pinning starts at `md`: on a phone the pinned block would cover most of the narrow scroll port.
 */
function pinnedCell<TRow extends RowData>(column: Column<DataTableFeatures, TRow, unknown>, offsets: PinnedOffsets) {
  const side = column.getIsPinned()
  if (!side) return { style: undefined, className: undefined }
  return {
    style: { '--pin-offset': `${offsets[column.id] ?? 0}px` } as React.CSSProperties,
    className: cn(
      'md:sticky',
      side === 'start' ? 'md:left-(--pin-offset)' : 'md:right-(--pin-offset)',
      // The pinned block's inner edge marks where the scrolled columns slide underneath.
      side === 'start' && column.getIsLastColumn('start') && 'md:shadow-[inset_-1px_0_0_var(--color-border)]',
      side === 'end' && column.getIsFirstColumn('end') && 'md:shadow-[inset_1px_0_0_var(--color-border)]'
    )
  }
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
  className,
  stickyHeader = false,
  showPagination = true,
  pagination,
  containerClassName,
  fillHeight = false
}: DataTableProps<TRow>) {
  // The final row model applies filtering, sorting, expansion and pagination. Reading the expanded
  // model alone skipped pagination, so a client-paginated table rendered every row on every page.
  const rows = table.getRowModel().rows
  const columnCount = table.getVisibleLeafColumns().length
  const rowCount = table.getRowCount()
  const hasFooter = showPagination && rowCount > 0
  // A table that scrolls inside the card must pin its header; force it for fill-height tables.
  const isSticky = stickyHeader || fillHeight
  const headerRowRef = React.useRef<HTMLTableRowElement>(null)
  const pinnedKey = `${table
    .getStartVisibleLeafColumns()
    .map(column => column.id)
    .join(',')}|${table
    .getEndVisibleLeafColumns()
    .map(column => column.id)
    .join(',')}`
  const offsets = usePinnedOffsets(headerRowRef, pinnedKey)

  return (
    // The pagination footer owns the bottom padding; without a footer the shell supplies the same
    // 16px itself.
    <div
      className={cn(
        'flex flex-1 flex-col',
        fillHeight && 'min-h-0',
        fillHeight && '*:data-[slot=table-container]:min-h-0 *:data-[slot=table-container]:flex-1',
        // The scroll port cuts rows mid-way when they overflow; its own bottom edge closes the column
        // dividers there instead of leaving them hanging into the clipped row.
        fillHeight && '*:data-[slot=table-container]:border-b',
        !hasFooter && 'pb-4',
        containerClassName
      )}
    >
      <Table
        scrollArea
        className={cn(
          "**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4",
          isShowingPreviousRows && !isError && 'opacity-60 transition-opacity',
          className
        )}
      >
        {/* The sticky cells below draw their own edges, so the row must not add them. */}
        <TableHeader className={cn(!isSticky && '[&_tr]:border-t', isSticky && '[&_tr]:border-b-0')}>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} ref={headerRowRef}>
              {headerGroup.headers.map(header => {
                const pinned = pinnedCell(header.column, offsets)
                return (
                  <TableHead
                    key={header.id}
                    data-column-id={header.column.id}
                    style={pinned.style}
                    className={cn(
                      // A tinted band separates the header from the rows; `bg-background` would match
                      // the card in light mode, where `--card` and `--background` are the same colour.
                      // The tint is layered over the surface because dark `--muted` is translucent, and
                      // sticky cells must stay opaque for rows and pinned columns sliding underneath.
                      // `--table-surface` is what the table sits on: the card, or the page in fullscreen.
                      'bg-[var(--table-surface,var(--color-card))] bg-linear-to-b from-muted to-muted py-4 font-normal',
                      // A collapsed table paints its borders as one grid below the sticky cell, so the
                      // header draws its edges itself: the bottom one sits on the collapsed border it
                      // replaces, the top one just inside the cell where the scroll port cannot clip it.
                      isSticky &&
                        cn(
                          'sticky top-0 z-10',
                          "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border before:content-['']",
                          "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-border after:content-['']"
                        ),
                      pinned.className,
                      pinned.className && (isSticky ? 'z-20' : 'z-2')
                    )}
                  >
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody className={cn(fillHeight && '[&_tr:last-child]:border-b')}>
          {rows.length ? (
            rows.map(row => (
              <TableRow
                key={row.id}
                data-selected={row.getIsSelected() || undefined}
                className={cn(row.getIsSelected() && 'bg-muted/30')}
              >
                {row.getVisibleCells().map(cell => {
                  const pinned = pinnedCell(cell.column, offsets)
                  return (
                    <TableCell
                      key={cell.id}
                      style={pinned.style}
                      className={cn(
                        'py-3.5',
                        // Pinned cells are opaque so scrolled cells slide under them; the gradient layer
                        // repeats the row's translucent selection and hover tints over the surface.
                        pinned.className &&
                          cn(
                            pinned.className,
                            'z-1 bg-[var(--table-surface,var(--color-card))] bg-linear-to-b from-transparent to-transparent',
                            '[tr[data-selected]>&]:from-muted/30 [tr[data-selected]>&]:to-muted/30',
                            '[tr:hover>&]:from-muted/50 [tr:hover>&]:to-muted/50'
                          )
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          ) : isLoading ? (
            <TableSkeletonRows table={table} widths={skeletonWidths} />
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="h-32">
                <QueryState
                  state={isError ? 'error' : 'empty'}
                  title={isError ? '数据加载失败' : emptyTitle}
                  onRetry={isError ? onRetry : undefined}
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {showPagination ? <TablePagination table={table} showTopBorder={!fillHeight} {...pagination} /> : null}
    </div>
  )
}
