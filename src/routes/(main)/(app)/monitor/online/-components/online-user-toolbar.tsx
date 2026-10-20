import type { ReactTable } from '@tanstack/react-table'
import type { DateRange } from 'react-day-picker'

import { Maximize, Minimize, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'

import { DateRangeFilter } from '@/components/date-range-filter'
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
import type { OnlineUserResp } from '@/lib/api/online'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface OnlineUserToolbarProps {
  readonly table: ReactTable<DataTableFeatures, OnlineUserResp>
  readonly isRefreshing: boolean
  readonly isFullscreen: boolean
  readonly loginTime: DateRange | undefined
  readonly onLoginTimeChange: (value: DateRange | undefined) => void
  readonly onReset: () => void
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

/** Filters on the left, table tools on the right. */
export function OnlineUserToolbar({
  table,
  isRefreshing,
  isFullscreen,
  loginTime,
  onLoginTimeChange,
  onReset,
  onRefresh,
  onToggleFullscreen,
  onResetColumns
}: OnlineUserToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter value={loginTime} onChange={onLoginTimeChange} placeholder="登录时间" />
        <Button size="sm" variant="outline" onClick={onReset}>
          <RotateCcw />
          重置
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? <Spinner /> : <RefreshCw />}
          刷新
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
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

        <Button size="sm" variant="outline" onClick={onToggleFullscreen}>
          {isFullscreen ? <Minimize /> : <Maximize />}
          表格全屏
        </Button>
      </div>
    </div>
  )
}
