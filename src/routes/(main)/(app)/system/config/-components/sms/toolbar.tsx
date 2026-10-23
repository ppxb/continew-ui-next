import type { ReactTable } from '@tanstack/react-table'
import { Maximize, Minimize, Plus, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'

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
import type { SmsConfigResp } from '@/lib/api/sms'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface SmsToolbarProps {
  readonly table: ReactTable<DataTableFeatures, SmsConfigResp>
  readonly isRefreshing: boolean
  readonly isFullscreen: boolean
  readonly canCreate: boolean
  readonly onCreate: () => void
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

export function SmsToolbar({
  table,
  isRefreshing,
  isFullscreen,
  canCreate,
  onCreate,
  onRefresh,
  onToggleFullscreen,
  onResetColumns
}: SmsToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canCreate && (
          <Button onClick={onCreate}>
            <Plus />
            新增配置
          </Button>
        )}
      </div>

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

        <Button variant="outline" onClick={onToggleFullscreen} aria-label={isFullscreen ? '退出全屏' : '全屏'}>
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
      </div>
    </div>
  )
}
