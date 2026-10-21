import type { ReactTable } from '@tanstack/react-table'

import { Download, Maximize, Minimize, Plus, RefreshCw, RotateCcw, SlidersHorizontal, Upload } from 'lucide-react'

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
import type { UserResp } from '@/lib/api/user'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface UserToolbarProps {
  readonly table: ReactTable<DataTableFeatures, UserResp>
  readonly isRefreshing: boolean
  readonly isExporting: boolean
  readonly isFullscreen: boolean
  readonly onCreate: () => void
  readonly onImport: () => void
  readonly onExport: () => void
  readonly onRefresh: () => void
  readonly onToggleFullscreen: () => void
  readonly onResetColumns: () => void
}

/** Table actions, placed next to the filters on desktop and below them on mobile. */
export function UserToolbar({
  table,
  isRefreshing,
  isExporting,
  isFullscreen,
  onCreate,
  onImport,
  onExport,
  onRefresh,
  onToggleFullscreen,
  onResetColumns
}: UserToolbarProps) {
  const hideableColumns = table.getAllColumns().filter(column => column.getCanHide())

  return (
    <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
      <Button className="w-full sm:w-auto" onClick={onCreate}>
        <Plus />
        新增用户
      </Button>
      <Button variant="outline" onClick={onImport}>
        <Upload />
        导入数据
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
