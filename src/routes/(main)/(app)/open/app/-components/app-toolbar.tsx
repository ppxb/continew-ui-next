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
    <div className="flex flex-wrap items-center justify-between gap-3 px-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onCreate} className="inline-flex items-center justify-center gap-1.5">
          <Plus className="size-3.5 shrink-0" />
          <span className="leading-none">新增应用</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isExporting}
          onClick={onExport}
          className="inline-flex items-center justify-center gap-1.5"
        >
          {isExporting ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />}
          <span className="leading-none">导出</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isRefreshing}
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-1.5"
        >
          {isRefreshing ? <Spinner className="size-3.5" /> : <RefreshCw className="size-3.5" />}
          <span className="leading-none">刷新</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button size="sm" variant="outline" className="inline-flex items-center justify-center gap-1.5" />}
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="leading-none">隐藏列</span>
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

        <Button
          size="sm"
          variant="outline"
          onClick={onToggleFullscreen}
          className="inline-flex items-center justify-center gap-1.5"
        >
          {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
          <span className="leading-none">表格全屏</span>
        </Button>
      </div>
    </div>
  )
}
