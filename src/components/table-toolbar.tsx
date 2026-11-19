import type { ReactNode } from 'react'

import type { ReactTable, RowData } from '@tanstack/react-table'
import { cn } from 'cn'
import { Maximize, Minimize, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface TableToolbarProps<TRow extends RowData> {
  readonly table: ReactTable<DataTableFeatures, TRow>
  readonly actions?: ReactNode
  readonly isRefreshing: boolean
  readonly isFullscreen: boolean
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
  readonly className?: string
  /** Labels for columns whose header renders a node, which the hide menu cannot read. */
  readonly columnLabels?: Record<string, ReactNode>
  /** Omitted flags preserve the controls shown by existing table screens. */
  readonly options?: false | { reload?: boolean; setting?: boolean; fullScreen?: boolean }
}

/** Shared refresh, column visibility and fullscreen controls for list tables. */
export function TableToolbar<TRow extends RowData>({
  table,
  actions,
  isRefreshing,
  isFullscreen,
  onRefresh,
  onToggleFullscreen,
  onResetColumns,
  className,
  columnLabels,
  options
}: TableToolbarProps<TRow>) {
  const hideableColumns = table
    .getAllColumns()
    .filter(column => column.getCanHide() && !column.columnDef.meta?.hideInSetting)

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {actions}

      {options !== false && options?.reload !== false ? (
        <Button variant="outline" size="icon" disabled={isRefreshing} onClick={onRefresh} aria-label="刷新">
          {isRefreshing ? <Spinner /> : <RefreshCw />}
        </Button>
      ) : null}

      {options !== false && options?.setting !== false ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="显示的列" />}>
            <SlidersHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>显示的列</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hideableColumns.map(column => {
                const label =
                  typeof column.columnDef.header === 'string'
                    ? column.columnDef.header
                    : (columnLabels?.[column.id] ?? column.id)

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={value => column.toggleVisibility(value)}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onResetColumns}>
              <RotateCcw />
              重置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {options !== false && options?.fullScreen !== false ? (
        <Button
          variant="outline"
          onClick={onToggleFullscreen}
          size="icon"
          aria-label={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
      ) : null}
    </div>
  )
}
