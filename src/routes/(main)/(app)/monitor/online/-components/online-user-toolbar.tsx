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

interface OnlineUserFiltersProps {
  readonly loginTime: DateRange | undefined
  readonly onLoginTimeChange: (value: DateRange | undefined) => void
  readonly onReset: () => void
}

/** The login-time filter and its reset, rendered in the list's filter row. */
export function OnlineUserFilters({ loginTime, onLoginTimeChange, onReset }: OnlineUserFiltersProps) {
  return (
    <>
      <DateRangeFilter value={loginTime} onChange={onLoginTimeChange} placeholder="登录时间" />
      <Button type="button" variant="outline" onClick={onReset}>
        <RotateCcw />
        重置
      </Button>
    </>
  )
}

interface OnlineUserToolbarProps {
  readonly table: ReactTable<DataTableFeatures, OnlineUserResp>
  readonly isRefreshing: boolean
  readonly isFullscreen: boolean
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

/** The table tools, rendered on the right of the filter row. */
export function OnlineUserToolbar({
  table,
  isRefreshing,
  isFullscreen,
  onRefresh,
  onToggleFullscreen,
  onResetColumns
}: OnlineUserToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center gap-2">
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
