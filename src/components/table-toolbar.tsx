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
  className
}: TableToolbarProps<TRow>) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {actions}

      <Button variant="outline" disabled={isRefreshing} onClick={onRefresh}>
        {isRefreshing ? <Spinner /> : <RefreshCw />}
        刷新
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          <SlidersHorizontal />
          隐藏列
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuLabel>显示的列</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hideableColumns.map(column => {
              const label = typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id

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

      <Button variant="outline" onClick={onToggleFullscreen}>
        {isFullscreen ? <Minimize /> : <Maximize />}
        表格全屏
      </Button>
    </div>
  )
}
