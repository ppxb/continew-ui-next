import type { ReactTable } from '@tanstack/react-table'

import { Download, Maximize, Minimize, Plus, RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'

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
import type { AppResp } from '@/lib/api/app'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface AppToolbarProps {
  readonly table: ReactTable<DataTableFeatures, AppResp>
  readonly isRefreshing: boolean
  readonly isExporting: boolean
  readonly isFullscreen: boolean
  readonly onCreate: () => void
  readonly onExport: () => void
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

/** Actions on the left, table tools on the right. */
export function AppToolbar({
  table,
  isRefreshing,
  isExporting,
  isFullscreen,
  onCreate,
  onExport,
  onRefresh,
  onToggleFullscreen,
  onResetColumns
}: AppToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={onCreate}>
        <Plus />
        新增应用
      </Button>

      <Button variant="outline" disabled={isExporting} onClick={onExport}>
        {isExporting ? <Spinner /> : <Download />}
        导出
      </Button>

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
